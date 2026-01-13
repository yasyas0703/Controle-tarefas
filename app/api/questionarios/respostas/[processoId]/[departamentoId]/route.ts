import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { processoId: string; departamentoId: string } }
) {
  try {
    const respostas = await prisma.respostaQuestionario.findMany({
      where: {
        processoId: parseInt(params.processoId),
        questionario: {
          departamentoId: parseInt(params.departamentoId),
        },
      },
      include: {
        questionario: true,
        respondidoPor: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { respondidoEm: 'desc' },
    });
    
    return NextResponse.json(respostas);
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar respostas' },
      { status: 500 }
    );
  }
}




