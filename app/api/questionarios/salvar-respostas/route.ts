import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';

// POST /api/questionarios/salvar-respostas
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;
    
    const { processoId, departamentoId, respostas } = await request.json();
    
    if (!processoId || !departamentoId || !respostas) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Salvar/atualizar respostas
    const resultados = await Promise.all(
      Object.entries(respostas).map(async ([questionarioId, resposta]) => {
        const respostaString = typeof resposta === 'string' 
          ? resposta 
          : JSON.stringify(resposta);
        
        return prisma.respostaQuestionario.upsert({
          where: {
            processoId_questionarioId: {
              processoId: parseInt(processoId),
              questionarioId: parseInt(questionarioId),
            },
          },
          update: {
            resposta: respostaString,
            respondidoPorId: user.id,
          },
          create: {
            processoId: parseInt(processoId),
            questionarioId: parseInt(questionarioId),
            resposta: respostaString,
            respondidoPorId: user.id,
          },
        });
      })
    );
    
    return NextResponse.json({ 
      message: 'Respostas salvas com sucesso',
      respostas: resultados,
    });
  } catch (error) {
    console.error('Erro ao salvar respostas:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar respostas' },
      { status: 500 }
    );
  }
}




