import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';

// PUT /api/tags/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    if (!requireRole(user, ['ADMIN', 'GERENTE', 'USUARIO'])) {
      return NextResponse.json({ error: 'Sem permissão para editar tags' }, { status: 403 });
    }

    const data = await request.json();
    
    const tag = await prisma.tag.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.cor !== undefined && { cor: data.cor }),
        ...(data.texto !== undefined && { texto: data.texto }),
      },
    });
    
    return NextResponse.json(tag);
  } catch (error: any) {
    console.error('Erro ao atualizar tag:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Tag já existe' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    if (!requireRole(user, ['ADMIN', 'GERENTE', 'USUARIO'])) {
      return NextResponse.json({ error: 'Sem permissão para excluir tags' }, { status: 403 });
    }

    await prisma.tag.delete({
      where: { id: parseInt(params.id) },
    });
    
    return NextResponse.json({ message: 'Tag excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir tag:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir tag' },
      { status: 500 }
    );
  }
}

// POST /api/tags/:id/processos/:processoId - Adicionar tag a processo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const { processoId } = await request.json();
    
    await prisma.processoTag.create({
      data: {
        processoId: parseInt(processoId),
        tagId: parseInt(params.id),
      },
    });
    
    return NextResponse.json({ message: 'Tag adicionada ao processo' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Tag já está associada ao processo' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao adicionar tag' },
      { status: 500 }
    );
  }
}




