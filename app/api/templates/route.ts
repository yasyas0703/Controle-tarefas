import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// GET /api/templates
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      include: {
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
      orderBy: { criado_em: 'desc' },
    });
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const data = await request.json();
    
    const template = await prisma.template.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        fluxoDepartamentos: data.fluxoDepartamentos || [],
        questionariosPorDepartamento: data.questionariosPorDepartamento || {},
        criadoPorId: parseInt(userId),
      },
      include: {
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
    });
    
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar template:', error);
    return NextResponse.json(
      { error: 'Erro ao criar template' },
      { status: 500 }
    );
  }
}

