import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

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
    await prisma.template.delete({
      where: { id: parseInt(params.id) },
    });
    
    return NextResponse.json({ message: 'Template excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir template:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir template' },
      { status: 500 }
    );
  }
}




