import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';

// GET /api/departamentos/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const departamento = await prisma.departamento.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        questionarios: {
          orderBy: { ordem: 'asc' },
        },
        documentosObrigatorios: true,
        _count: {
          select: { processos: true },
        },
      },
    });
    
    if (!departamento) {
      return NextResponse.json(
        { error: 'Departamento não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(departamento);
  } catch (error) {
    console.error('Erro ao buscar departamento:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar departamento' },
      { status: 500 }
    );
  }
}

// PUT /api/departamentos/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const departamento = await prisma.departamento.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.responsavel !== undefined && { responsavel: data.responsavel }),
        ...(data.cor !== undefined && { cor: data.cor }),
        ...(data.icone !== undefined && { icone: data.icone }),
        ...(data.ordem !== undefined && { ordem: data.ordem }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
    });
    
    return NextResponse.json(departamento);
  } catch (error) {
    console.error('Erro ao atualizar departamento:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar departamento' },
      { status: 500 }
    );
  }
}

// DELETE /api/departamentos/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.departamento.update({
      where: { id: parseInt(params.id) },
      data: { ativo: false },
    });
    
    return NextResponse.json({ message: 'Departamento desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir departamento:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir departamento' },
      { status: 500 }
    );
  }
}

