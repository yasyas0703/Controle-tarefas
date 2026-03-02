import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';
import { GHOST_USER_EMAIL } from '@/app/utils/constants';

/**
 * GET /api/auditoria
 * Busca o histÃ³rico de eventos de um processo
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const { searchParams } = new URL(request.url);
    const processoId = searchParams.get('processoId');

    if (!processoId) {
      return NextResponse.json({ error: 'processoId Ã© obrigatÃ³rio' }, { status: 400 });
    }

    const pid = parseInt(processoId);

    // Buscar o processo para verificar interligaÃ§Ãµes
    const processo = await prisma.processo.findUnique({
      where: { id: pid },
      select: { id: true, interligadoComId: true, interligadoNome: true, nomeServico: true, nomeEmpresa: true },
    });

    // Coletar IDs de todos os processos interligados
    const processosIds = new Set<number>([pid]);
    const processosNomes: Record<number, string> = {};
    if (processo) {
      processosNomes[pid] = processo.nomeServico || processo.nomeEmpresa || `#${pid}`;
    }

    // Processo pai (este processo Ã© continuaÃ§Ã£o de outro)
    if (processo?.interligadoComId) {
      processosIds.add(processo.interligadoComId);
      processosNomes[processo.interligadoComId] = processo.interligadoNome || `#${processo.interligadoComId}`;
    }

    // Processos filhos (outros processos que sÃ£o continuaÃ§Ã£o deste)
    const filhos = await prisma.processo.findMany({
      where: { interligadoComId: pid },
      select: { id: true, nomeServico: true, nomeEmpresa: true },
    });
    for (const f of filhos) {
      processosIds.add(f.id);
      processosNomes[f.id] = f.nomeServico || f.nomeEmpresa || `#${f.id}`;
    }

    // TambÃ©m verificar via tabela InterligacaoProcesso
    try {
      const interligacoes = await (prisma as any).interligacaoProcesso.findMany({
        where: {
          OR: [
            { processoOrigemId: pid },
            { processoDestinoId: pid },
          ],
        },
      });
      for (const inter of interligacoes) {
        if (inter.processoOrigemId !== pid) processosIds.add(inter.processoOrigemId);
        if (inter.processoDestinoId !== pid) processosIds.add(inter.processoDestinoId);
      }
    } catch { /* tabela pode nÃ£o existir */ }

    // Buscar nomes de processos que ainda nÃ£o temos
    const idsSemNome = Array.from(processosIds).filter(id => !processosNomes[id]);
    if (idsSemNome.length > 0) {
      const extras = await prisma.processo.findMany({
        where: { id: { in: idsSemNome } },
        select: { id: true, nomeServico: true, nomeEmpresa: true },
      });
      for (const e of extras) {
        processosNomes[e.id] = e.nomeServico || e.nomeEmpresa || `#${e.id}`;
      }
    }

    // Buscar histÃ³rico de eventos de TODOS os processos interligados (excluindo ghost)
    const historico = await prisma.historicoEvento.findMany({
      where: {
        processoId: { in: Array.from(processosIds) },
        responsavel: { email: { not: GHOST_USER_EMAIL }, isGhost: { not: true } },
      },
      include: {
        responsavel: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: {
        data: 'desc',
      },
    });

    // Serializar BigInt para string e adicionar informaÃ§Ã£o do processo de origem
    const historicoSerializado = historico.map((evento) => ({
      ...evento,
      dataTimestamp: evento.dataTimestamp ? evento.dataTimestamp.toString() : null,
      // Campos extras para o front identificar eventos de processos interligados
      processoOrigemId: evento.processoId,
      processoOrigemNome: processosNomes[evento.processoId] || `#${evento.processoId}`,
      isInterligado: evento.processoId !== pid,
    }));

    return NextResponse.json(historicoSerializado);
  } catch (error) {
    console.error('Erro ao buscar histÃ³rico:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histÃ³rico', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auditoria
 * Registra um novo evento no histÃ³rico
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    // Ghost user: nÃ£o registrar eventos
    const ghostCheck = await prisma.usuario.findUnique({ where: { id: user.id as number }, select: { isGhost: true, email: true } });
    if (ghostCheck?.isGhost || ghostCheck?.email === GHOST_USER_EMAIL) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = await request.json();
    const { processoId, tipo, acao, responsavelId, departamento, detalhes, dataTimestamp } = body;

    if (!processoId || !tipo || !acao) {
      return NextResponse.json(
        { error: 'processoId, tipo e acao sÃ£o obrigatÃ³rios' },
        { status: 400 }
      );
    }

    // Validar tipo de evento
    const tiposValidos = ['INICIO', 'ALTERACAO', 'MOVIMENTACAO', 'CONCLUSAO', 'FINALIZACAO', 'DOCUMENTO', 'COMENTARIO'];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo de evento invÃ¡lido. Use: ${tiposValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Criar evento no histÃ³rico
    const evento = await prisma.historicoEvento.create({
      data: {
        processoId: parseInt(processoId),
        tipo,
        acao,
        responsavelId: responsavelId || user.id,
        departamento,
        dataTimestamp: dataTimestamp || Date.now(),
      },
      include: {
        responsavel: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(evento, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar evento', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auditoria/[id]
 * Remove um evento do histÃ³rico (apenas para admins)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    // Apenas admins podem deletar histÃ³rico
    if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Apenas administradores podem deletar histÃ³rico' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id Ã© obrigatÃ³rio' }, { status: 400 });
    }

    await prisma.historicoEvento.delete({
      where: {
        id: parseInt(id),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar evento', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

