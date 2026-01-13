import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { verifyPassword, generateToken } from '@/app/utils/auth';

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
      
      // Verificar se é erro de autenticação
      if (dbError.message?.includes('Authentication failed') || 
          dbError.message?.includes('credentials') ||
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
      if (dbError.code === 'P1001' || dbError.message?.includes('connect')) {
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
    
    const token = generateToken({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
    });
    
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
    
    // Definir cookie com token
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });
    
    return response;
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

