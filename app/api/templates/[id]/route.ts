import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// GET /api/templates/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
    });
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(template);
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const template = await prisma.template.findUnique({ where: { id: parseInt(params.id) } });
    if (!template) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });

    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 15);

    try {
      const dadosOriginais = JSON.parse(JSON.stringify(template));
      await prisma.itemLixeira.create({
        data: {
          tipoItem: 'TEMPLATE',
          itemIdOriginal: template.id,
          dadosOriginais,
          visibility: 'PUBLIC',
          allowedRoles: [],
          allowedUserIds: [],
          deletadoPorId: user.id as number,
          expiraEm: dataExpiracao,
          nomeItem: template.nome,
          descricaoItem: template.descricao || null,
        }
      });
    } catch (e) {
      console.error('Erro ao criar ItemLixeira for template:', e);
    }

    await prisma.template.delete({ where: { id: template.id } });
    return NextResponse.json({ message: 'Template movido para lixeira' });
  } catch (error) {
    console.error('Erro ao excluir template:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir template' },
      { status: 500 }
    );
  }
}




