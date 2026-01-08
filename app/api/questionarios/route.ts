import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// GET /api/questionarios?departamentoId=123&processoId=456
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departamentoId = searchParams.get('departamentoId');
    const processoId = searchParams.get('processoId');
    
    if (!departamentoId) {
      return NextResponse.json(
        { error: 'departamentoId é obrigatório' },
        { status: 400 }
      );
    }
    
    const questionarios = await prisma.questionarioDepartamento.findMany({
      where: {
        departamentoId: parseInt(departamentoId),
        ...(processoId ? { processoId: parseInt(processoId) } : { processoId: null }),
      },
      orderBy: { ordem: 'asc' },
      include: {
        respostas: {
          include: {
            respondidoPor: {
              select: { id: true, nome: true },
            },
          },
        },
      },
    });
    
    return NextResponse.json(questionarios);
  } catch (error) {
    console.error('Erro ao buscar questionários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar questionários' },
      { status: 500 }
    );
  }
}

// POST /api/questionarios - Criar pergunta
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const questionario = await prisma.questionarioDepartamento.create({
      data: {
        departamentoId: data.departamentoId,
        processoId: data.processoId || null,
        label: data.label,
        tipo: data.tipo,
        obrigatorio: data.obrigatorio || false,
        ordem: data.ordem || 0,
        opcoes: data.opcoes || [],
        placeholder: data.placeholder,
        descricao: data.descricao,
        condicaoPerguntaId: data.condicaoPerguntaId,
        condicaoOperador: data.condicaoOperador,
        condicaoValor: data.condicaoValor,
      },
    });
    
    return NextResponse.json(questionario, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pergunta:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pergunta' },
      { status: 500 }
    );
  }
}

