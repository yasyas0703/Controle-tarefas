import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// POST /api/processos/:id/avancar
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    if (roleUpper === 'USUARIO') {
      return NextResponse.json({ error: 'Sem permissão para avançar processo' }, { status: 403 });
    }
    
    const processoId = parseInt(params.id);
    
    // Buscar processo
    const processo = await prisma.processo.findUnique({
      where: { id: processoId },
      include: {
        historicoFluxos: {
          orderBy: { ordem: 'desc' },
          take: 1,
        },
      },
    });
    
    if (!processo) {
      return NextResponse.json(
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }

    if (roleUpper === 'GERENTE') {
      const departamentoUsuarioRaw = (user as any).departamentoId ?? (user as any).departamento_id;
      const departamentoUsuario = Number.isFinite(Number(departamentoUsuarioRaw)) ? Number(departamentoUsuarioRaw) : undefined;
      if (typeof departamentoUsuario !== 'number') {
        return NextResponse.json({ error: 'Usuário sem departamento definido' }, { status: 403 });
      }
      if (processo.departamentoAtual !== departamentoUsuario) {
        return NextResponse.json({ error: 'Sem permissão para mover processo de outro departamento' }, { status: 403 });
      }
    }
    
    // Verificar se há próximo departamento
    const proximoIndex = processo.departamentoAtualIndex + 1;
    if (!processo.fluxoDepartamentos || proximoIndex >= processo.fluxoDepartamentos.length) {
      return NextResponse.json(
        { error: 'Processo já está no último departamento' },
        { status: 400 }
      );
    }
    
    const proximoDepartamentoId = processo.fluxoDepartamentos[proximoIndex];
    const departamentoAtual = await prisma.departamento.findUnique({
      where: { id: processo.departamentoAtual },
    });
    const proximoDepartamento = await prisma.departamento.findUnique({
      where: { id: proximoDepartamentoId },
    });
    
    if (!proximoDepartamento) {
      return NextResponse.json(
        { error: 'Próximo departamento não encontrado' },
        { status: 404 }
      );
    }
    
    // Atualizar processo
    const processoAtualizado = await prisma.processo.update({
      where: { id: processoId },
      data: {
        departamentoAtual: proximoDepartamentoId,
        departamentoAtualIndex: proximoIndex,
        progresso: Math.round(((proximoIndex + 1) / processo.fluxoDepartamentos.length) * 100),
        dataAtualizacao: new Date(),
      },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
      },
    });
    
    // Marcar histórico de fluxo anterior como concluído
    const ultimoFluxo = processo.historicoFluxos[0];
    if (ultimoFluxo) {
      await prisma.historicoFluxo.update({
        where: { id: ultimoFluxo.id },
        data: {
          status: 'concluido',
          saidaEm: new Date(),
        },
      });
    }
    
    // Criar novo histórico de fluxo
    await prisma.historicoFluxo.create({
      data: {
        processoId: processoId,
        departamentoId: proximoDepartamentoId,
        ordem: proximoIndex,
        status: 'em_andamento',
        entradaEm: new Date(),
      },
    });
    
    // Criar evento de movimentação
    await prisma.historicoEvento.create({
      data: {
        processoId: processoId,
        tipo: 'MOVIMENTACAO',
        acao: `Processo movido de "${departamentoAtual?.nome || 'N/A'}" para "${proximoDepartamento.nome}"`,
        responsavelId: user.id,
        departamento: proximoDepartamento.nome,
        dataTimestamp: BigInt(Date.now()),
      },
    });

    // Criar notificações persistidas: somente gerentes do dept destino e responsável do processo (se definido)
    try {
      const gerentesDestino = await prisma.usuario.findMany({
        where: {
          ativo: true,
          role: 'GERENTE',
          departamentoId: proximoDepartamentoId,
        },
        select: { id: true },
      });

      const ids = new Set<number>(gerentesDestino.map((u) => u.id));

      // responsável do processo (se existir)
      if (typeof (processoAtualizado as any).responsavelId === 'number') {
        ids.add((processoAtualizado as any).responsavelId);
      }

      // evita notificar quem moveu
      ids.delete(user.id);

      const destinatarios = Array.from(ids);
      if (destinatarios.length > 0) {
        const nomeEmpresa = processoAtualizado.nomeEmpresa || 'Empresa';
        const nomeServico = processoAtualizado.nomeServico ? ` - ${processoAtualizado.nomeServico}` : '';
        const mensagem = `Processo no seu departamento: ${nomeEmpresa}${nomeServico}`;

        await prisma.notificacao.createMany({
          data: destinatarios.map((id) => ({
            usuarioId: id,
            mensagem,
            tipo: 'INFO',
            processoId: processoId,
            link: `/`,
          })),
        });
      }
    } catch (e) {
      // Não derruba a movimentação se notificação falhar
      console.error('Erro ao criar notificações de movimentação:', e);
    }
    
    return NextResponse.json(processoAtualizado);
  } catch (error) {
    console.error('Erro ao avançar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao avançar processo' },
      { status: 500 }
    );
  }
}

