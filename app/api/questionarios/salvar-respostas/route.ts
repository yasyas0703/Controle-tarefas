import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';
import { registrarLog, getIp } from '@/app/utils/logAuditoria';
import { assertProcessAccess } from '@/app/utils/processAccess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// POST /api/questionarios/salvar-respostas
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;
    
    const { processoId, departamentoId, respostas } = await request.json();
    const pid = Number(processoId);
    const did = Number(departamentoId);
    
    if (!pid || !did || !respostas || typeof respostas !== 'object') {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    const access = await assertProcessAccess(user, pid, 'answer_questionario', { departamentoId: did });
    if (access.error) return access.error;

    const questionarioIds = Object.keys(respostas)
      .map((questionarioId) => Number(questionarioId))
      .filter((questionarioId) => Number.isFinite(questionarioId) && questionarioId > 0);

    const questionariosValidos = await prisma.questionarioDepartamento.findMany({
      where: {
        id: { in: questionarioIds },
        processoId: pid,
        departamentoId: did,
      },
      select: { id: true },
    });

    if (questionariosValidos.length !== questionarioIds.length) {
      return NextResponse.json(
        { error: 'Há perguntas inválidas para este processo/departamento' },
        { status: 403 }
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
              processoId: pid,
              questionarioId: parseInt(questionarioId),
            },
          },
          update: {
            resposta: respostaString,
            respondidoPorId: user.id,
          },
          create: {
            processoId: pid,
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
      entidadeId: pid,
      entidadeNome: `Respostas do processo #${pid}`,
      processoId: pid,
      departamentoId: did,
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




