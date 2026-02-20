import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';
import { registrarLog, getIp } from '@/app/utils/logAuditoria';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

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

    await registrarLog({
      usuarioId: user.id,
      acao: 'PREENCHER',
      entidade: 'QUESTIONARIO',
      entidadeId: parseInt(processoId),
      entidadeNome: `Respostas do processo #${processoId}`,
      processoId: parseInt(processoId),
      departamentoId: parseInt(departamentoId),
      ip: getIp(request),
    });

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




