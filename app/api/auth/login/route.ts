import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { verifyPassword, generateToken } from '@/app/utils/auth';
import bcrypt from 'bcryptjs';
import { sendEmail, buildVerificationEmail } from '@/app/utils/email';
import { registrarLog, getIp } from '@/app/utils/logAuditoria';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();
    
    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Verificar se DATABASE_URL está configurada
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL não está configurada');
      return NextResponse.json(
        { 
          error: 'Erro de configuração do servidor',
          details: 'DATABASE_URL não está configurada. Verifique o arquivo .env'
        },
        { status: 500 }
      );
    }
    
    let usuario;
    try {
      usuario = await prisma.usuario.findUnique({
        where: { email },
      });
    } catch (dbError: any) {
      console.error('Erro ao conectar com o banco de dados:', dbError);

      const dbMessage =
        `${dbError?.message ?? ''} ${dbError?.cause?.message ?? ''}`.trim();

      // Supabase Pooler: erro típico quando o host/região/credenciais não batem com o projeto
      if (dbMessage.includes('Tenant or user not found')) {
        return NextResponse.json(
          {
            error: 'Erro de conexão com o banco de dados',
            details:
              'O Supabase retornou "Tenant or user not found". Normalmente é DATABASE_URL de pooling apontando para a região errada ou credenciais/projeto incorretos. Refaça a DATABASE_URL copiando do Supabase Dashboard (Settings > Database > Connection pooling).',
          },
          { status: 503 }
        );
      }
      
      // Verificar se é erro de autenticação
      if (dbMessage.includes('Authentication failed') || 
          dbMessage.includes('credentials') ||
          dbError.code === 'P1000') {
        return NextResponse.json(
          { 
            error: 'Erro de conexão com o banco de dados',
            details: 'Credenciais do banco de dados inválidas. Verifique o arquivo .env e confirme se a DATABASE_URL está correta.'
          },
          { status: 500 }
        );
      }
      
      // Outros erros de conexão
      if (dbError.code === 'P1001' || dbMessage.includes('connect')) {
        return NextResponse.json(
          { 
            error: 'Erro de conexão com o banco de dados',
            details: 'Não foi possível conectar ao banco de dados. Verifique se o servidor está acessível.'
          },
          { status: 500 }
        );
      }
      
      // Re-lançar outros erros
      throw dbError;
    }
    
    if (!usuario || !usuario.ativo) {
      // Audit log: tentativa de login falhou (usuário inativo)
      if (usuario) {
        await registrarLog({
          usuarioId: usuario.id,
          acao: 'LOGIN_FALHA',
          entidade: 'USUARIO',
          entidadeId: usuario.id,
          entidadeNome: usuario.nome,
          detalhes: 'Tentativa de login com conta inativa',
          ip: getIp(request),
        });
      }
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }
    
    const senhaValida = await verifyPassword(senha, usuario.senha);
    
    if (!senhaValida) {
      // Audit log: tentativa de login falhou (senha incorreta)
      await registrarLog({
        usuarioId: usuario.id,
        acao: 'LOGIN_FALHA',
        entidade: 'USUARIO',
        entidadeId: usuario.id,
        entidadeNome: usuario.nome,
        detalhes: 'Tentativa de login com senha incorreta',
        ip: getIp(request),
      });
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }
    
    // ===== VERIFICAÇÃO RECENTE: se o email já foi verificado nos últimos 7 dias, pula 2FA =====
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    const recentVerification = await prisma.emailVerificationCode.findFirst({
      where: {
        usuarioId: usuario.id,
        used: true,
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentVerification) {
      // Email já foi verificado recentemente — emitir token diretamente
      const token = generateToken({ userId: usuario.id, email: usuario.email, role: usuario.role });

      const response = NextResponse.json({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          ativo: usuario.ativo,
          departamentoId: usuario.departamentoId,
          permissoes: usuario.permissoes,
        },
        token,
      });

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      // Audit log: login realizado com sucesso (2FA dispensado)
      await registrarLog({
        usuarioId: usuario.id,
        acao: 'LOGIN',
        entidade: 'USUARIO',
        entidadeId: usuario.id,
        entidadeNome: usuario.nome,
        detalhes: 'Login realizado com sucesso',
        ip: getIp(request),
      });

      return response;
    }
    // ===== FIM DA VERIFICAÇÃO RECENTE =====

    // Limpa códigos expirados (mas NÃO os usados recentes — precisamos deles para a verificação acima)
    await prisma.emailVerificationCode.deleteMany({
      where: {
        usuarioId: usuario.id,
        OR: [
          { used: true, createdAt: { lt: sevenDaysAgo } },
          { expiresAt: { lt: new Date() }, used: false },
        ],
      },
    });

    // Rate limit: impede novo envio se o último código foi criado há menos de 2 minutos
    const RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutos
    const last = await prisma.emailVerificationCode.findFirst({
      where: { usuarioId: usuario.id, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (last) {
      const lastCreated = new Date(last.createdAt).getTime();
      if (Date.now() - lastCreated < RATE_LIMIT_MS) {
        const restanteSegundos = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastCreated)) / 1000);
        return NextResponse.json(
          { error: `Um código já foi enviado recentemente. Aguarde ${restanteSegundos} segundos.` },
          { status: 429 }
        );
      }
    }

    // Em vez de emitir token imediatamente, geramos um código de verificação e enviamos por email.
    // Código numérico de 6 dígitos
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Hash do código para armazenamento
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await prisma.emailVerificationCode.create({
      data: {
        usuarioId: usuario.id,
        codeHash,
        expiresAt,
      },
    });

    // Envia email com o código (captura erros, mas não revela no cliente se houver falha)
    try {
      const { html, text } = buildVerificationEmail(code, 5);
      await sendEmail(usuario.email, 'Código de verificação - Segundo passo', html, text);
    } catch (emailErr: any) {
      console.error('Erro ao enviar email de verificação:', emailErr);
      return NextResponse.json({ error: 'Falha ao enviar código por email' }, { status: 500 });
    }

    return NextResponse.json({ needEmailCode: true, message: 'Código enviado para o email cadastrado' });
  } catch (error: any) {
    console.error('Erro no login:', error);
    
    // Retornar mensagem de erro mais específica
    const errorMessage = error.message || 'Erro interno do servidor';
    const statusCode = error.statusCode || 500;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode }
    );
  }
}

