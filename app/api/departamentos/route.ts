import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// GET /api/departamentos
export async function GET() {
  try {
    const departamentos = await prisma.departamento.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
      include: {
        _count: {
          select: { processos: true },
        },
      },
    });
    
    return NextResponse.json(departamentos);
  } catch (error) {
    console.error('Erro ao buscar departamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar departamentos' },
      { status: 500 }
    );
  }
}

// POST /api/departamentos
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar campos obrigatórios
    if (!data.nome || !data.responsavel) {
      return NextResponse.json(
        { error: 'Nome e responsável são obrigatórios' },
        { status: 400 }
      );
    }
    
    const departamento = await prisma.departamento.create({
      data: {
        nome: String(data.nome).trim(),
        descricao: data.descricao ? String(data.descricao).trim() : null,
        responsavel: String(data.responsavel).trim(),
        cor: data.cor || 'from-cyan-500 to-blue-600',
        icone: data.icone ? String(data.icone) : 'FileText',
        ordem: data.ordem !== undefined ? Number(data.ordem) : 0,
        ativo: data.ativo !== undefined ? Boolean(data.ativo) : true,
      },
    });
    
    return NextResponse.json(departamento, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar departamento:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar departamento' },
      { status: 500 }
    );
  }
}

