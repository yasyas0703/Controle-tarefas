import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';

// PUT /api/comentarios/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const { texto } = await request.json();
    
    // Verificar se o comentário pertence ao usuário
    const comentarioExistente = await prisma.comentario.findUnique({
      where: { id: parseInt(params.id) },
    });
    
    if (!comentarioExistente) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      );
    }
    
    if (comentarioExistente.autorId !== parseInt(userId)) {
      return NextResponse.json(
        { error: 'Sem permissão para editar este comentário' },
        { status: 403 }
      );
    }
    
    const comentario = await prisma.comentario.update({
      where: { id: parseInt(params.id) },
      data: {
        texto,
        editado: true,
        editadoEm: new Date(),
      },
      include: {
        autor: {
          select: { id: true, nome: true, email: true },
        },
        departamento: {
          select: { id: true, nome: true },
        },
      },
    });
    
    return NextResponse.json(comentario);
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar comentário' },
      { status: 500 }
    );
  }
}

// DELETE /api/comentarios/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    // Verificar se o comentário pertence ao usuário ou se é admin
    const comentario = await prisma.comentario.findUnique({
      where: { id: parseInt(params.id) },
    });
    
    if (!comentario) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      );
    }
    
    if (comentario.autorId !== parseInt(userId) && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Sem permissão para excluir este comentário' },
        { status: 403 }
      );
    }
    
    await prisma.comentario.delete({
      where: { id: parseInt(params.id) },
    });
    
    return NextResponse.json({ message: 'Comentário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir comentário' },
      { status: 500 }
    );
  }
}



