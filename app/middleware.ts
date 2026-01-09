import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromToken } from '@/app/utils/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
  
  // Rotas públicas
  if (request.nextUrl.pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }
  
  // Rotas de API requerem autenticação
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    
    const user = await getUserFromToken(token);
    if (!user || !user.ativo) {
      return NextResponse.json(
        { error: 'Usuário inválido ou inativo' },
        { status: 401 }
      );
    }
    
    // Adicionar usuário ao request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(user.id));
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-email', user.email);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};



