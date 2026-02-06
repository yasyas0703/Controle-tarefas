import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { verifyPassword, generateToken } from '@/app/utils/auth';
import bcrypt from 'bcryptjs';
import { sendEmail, buildVerificationEmail } from '@/app/utils/email';

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
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }
    
    const senhaValida = await verifyPassword(senha, usuario.senha);
    
    if (!senhaValida) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }
    
    // Limita envio: checa último código criado e impede novo envio se foi nos últimos 7 dias
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const last = await prisma.emailVerificationCode.findFirst({
      where: { usuarioId: usuario.id },
      orderBy: { createdAt: 'desc' },
    });

    if (last) {
      const lastCreated = new Date(last.createdAt).getTime();
      if (Date.now() - lastCreated < oneWeekMs) {
        return NextResponse.json(
          { error: 'Um código já foi enviado recentemente. Aguarde uma semana para solicitar outro.' },
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

