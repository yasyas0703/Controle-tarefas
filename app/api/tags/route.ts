import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';

// GET /api/tags
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { processos: true },
        },
      },
    });
    
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Erro ao buscar tags:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar tags' },
      { status: 500 }
    );
  }
}

// POST /api/tags
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const tag = await prisma.tag.create({
      data: {
        nome: data.nome,
        cor: data.cor || 'bg-blue-500',
        texto: data.texto || 'text-white',
      },
    });
    
    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar tag:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Tag já existe' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao criar tag' },
      { status: 500 }
    );
  }
}

