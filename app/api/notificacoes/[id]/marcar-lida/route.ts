import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';

// PATCH /api/notificacoes/:id/marcar-lida
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    // Verificar se a notificação pertence ao usuário
    const notificacao = await prisma.notificacao.findUnique({
      where: { id: parseInt(params.id) },
    });
    
    if (!notificacao) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }
    
    if (notificacao.usuarioId !== parseInt(userId)) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }
    
    const notificacaoAtualizada = await prisma.notificacao.update({
      where: { id: parseInt(params.id) },
      data: { lida: true },
    });
    
    return NextResponse.json(notificacaoAtualizada);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return NextResponse.json(
      { error: 'Erro ao marcar notificação como lida' },
      { status: 500 }
    );
  }
}

