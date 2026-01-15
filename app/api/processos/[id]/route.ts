import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

function parseDateMaybe(value: any): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function jsonBigInt(data: unknown, init?: { status?: number }) {
  return new NextResponse(
    JSON.stringify(data, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
    {
      status: init?.status ?? 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    }
  );
}

// GET /api/processos/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const processo = await prisma.processo.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
        ...({ responsavel: { select: { id: true, nome: true, email: true } } } as any),
        comentarios: {
          include: { 
            autor: { select: { id: true, nome: true, email: true } },
            departamento: { select: { id: true, nome: true } },
          },
          orderBy: { criadoEm: 'desc' },
        },
        documentos: {
          orderBy: { dataUpload: 'desc' },
        },
        historicoEventos: {
          include: { responsavel: { select: { id: true, nome: true } } },
          orderBy: { data: 'desc' },
        },
        historicoFluxos: {
          include: { departamento: true },
          orderBy: { ordem: 'asc' },
        },
        questionarios: {
          include: {
            respostas: {
              include: { respondidoPor: { select: { id: true, nome: true } } },
            },
          },
          orderBy: { ordem: 'asc' },
        },
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    if (!processo) {
      return jsonBigInt({ error: 'Processo não encontrado' }, { status: 404 });
    }

    // Buscar todos os questionários por departamento vinculados a este processo
    const questionariosPorDepartamento = await prisma.questionarioDepartamento.findMany({
      where: {
        processoId: processo.id,
      },
      orderBy: { ordem: 'asc' },
    });

    // Montar objeto agrupado por departamentoId
    const questionariosPorDeptObj = {};
    for (const q of questionariosPorDepartamento) {
      if (!questionariosPorDeptObj[q.departamentoId]) questionariosPorDeptObj[q.departamentoId] = [];
      questionariosPorDeptObj[q.departamentoId].push(q);
    }

    // Adicionar ao processo
    (processo as any).questionariosPorDepartamento = questionariosPorDeptObj;

    return jsonBigInt(processo);
  } catch (error) {
    console.error('Erro ao buscar processo:', error);
    return jsonBigInt({ error: 'Erro ao buscar processo' }, { status: 500 });
  }
}

// PUT /api/processos/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    const data = await request.json();

    // Buscar processo atual para comparar mudanças
    const processoAntigo = await prisma.processo.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!processoAntigo) {
      return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 });
    }

    // Usuário normal: permitir apenas alteração de prioridade no próprio departamento
    if (roleUpper === 'USUARIO') {
      const departamentoUsuarioRaw = (user as any).departamentoId ?? (user as any).departamento_id;
      const departamentoUsuario = Number.isFinite(Number(departamentoUsuarioRaw)) ? Number(departamentoUsuarioRaw) : undefined;
      if (typeof departamentoUsuario !== 'number') {
        return NextResponse.json({ error: 'Usuário sem departamento definido' }, { status: 403 });
      }
      if (processoAntigo.departamentoAtual !== departamentoUsuario) {
        return NextResponse.json({ error: 'Sem permissão para editar processo de outro departamento' }, { status: 403 });
      }

      // Permite somente alteração de prioridade por usuário normal
      const allowedKeys = ['prioridade'];
      const sentKeys = Object.keys(data ?? {});
      if (sentKeys.some((k) => !allowedKeys.includes(k))) {
        return NextResponse.json({ error: 'Alteração não permitida para seu nível de acesso' }, { status: 403 });
      }
    }

    // Gerente/admin seguem validações abaixo
    if (roleUpper === 'GERENTE' || roleUpper === 'ADMIN') {
      // gerente validations continue below
    } else if (roleUpper !== 'GERENTE' && roleUpper !== 'ADMIN' && roleUpper !== 'USUARIO') {
      // any other role not handled above is forbidden
      return NextResponse.json({ error: 'Sem permissão para editar processo' }, { status: 403 });
    }

    if (roleUpper === 'GERENTE') {
      const departamentoUsuarioRaw = (user as any).departamentoId ?? (user as any).departamento_id;
      const departamentoUsuario = Number.isFinite(Number(departamentoUsuarioRaw)) ? Number(departamentoUsuarioRaw) : undefined;
      if (typeof departamentoUsuario !== 'number') {
        return NextResponse.json({ error: 'Usuário sem departamento definido' }, { status: 403 });
      }
      if (processoAntigo.departamentoAtual !== departamentoUsuario) {
        return NextResponse.json({ error: 'Sem permissão para editar processo de outro departamento' }, { status: 403 });
      }

      // gerente não pode "mover" via PUT (use /avancar)
      if (data?.departamentoAtual !== undefined && data.departamentoAtual !== processoAntigo.departamentoAtual) {
        return NextResponse.json({ error: 'Movimentação de departamento não permitida por esta ação' }, { status: 403 });
      }
      if (data?.departamentoAtualIndex !== undefined && data.departamentoAtualIndex !== processoAntigo.departamentoAtualIndex) {
        return NextResponse.json({ error: 'Movimentação de departamento não permitida por esta ação' }, { status: 403 });
      }
      if (data?.fluxoDepartamentos !== undefined) {
        return NextResponse.json({ error: 'Alteração do fluxo não permitida' }, { status: 403 });
      }

      // gerente só finaliza no último departamento
      const statusNovo = typeof data?.status === 'string' ? data.status.toUpperCase() : undefined;
      if (statusNovo === 'FINALIZADO' || statusNovo === 'FINALIZACAO') {
        const idx = Number(processoAntigo.departamentoAtualIndex ?? 0);
        const len = Array.isArray(processoAntigo.fluxoDepartamentos) ? processoAntigo.fluxoDepartamentos.length : 0;
        const isUltimo = len > 0 ? idx >= len - 1 : true;
        if (!isUltimo) {
          return NextResponse.json({ error: 'Só é possível finalizar no último departamento' }, { status: 403 });
        }
      }
    }
    
    const novoInicio = parseDateMaybe(data?.dataInicio);

    const dataEntregaFoiEnviada = Object.prototype.hasOwnProperty.call(data ?? {}, 'dataEntrega');
    const entregaParsed = parseDateMaybe(data?.dataEntrega);
    const entregaVaziaOuNula = dataEntregaFoiEnviada && (data?.dataEntrega === null || data?.dataEntrega === '');

    const inicioBaseParaPrazo =
      novoInicio ?? processoAntigo.dataInicio ?? processoAntigo.criadoEm ?? new Date();

    const entregaCalculada = entregaVaziaOuNula ? addDays(inicioBaseParaPrazo, 15) : undefined;

    const processo = await prisma.processo.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.nomeServico !== undefined && { nomeServico: data.nomeServico }),
        ...(data.nomeEmpresa !== undefined && { nomeEmpresa: data.nomeEmpresa }),
        ...(data.cliente !== undefined && { cliente: data.cliente }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.telefone !== undefined && { telefone: data.telefone }),
        ...(data.empresaId !== undefined && { empresaId: data.empresaId }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.prioridade !== undefined && { prioridade: data.prioridade }),
        ...(data.departamentoAtual !== undefined && { departamentoAtual: data.departamentoAtual }),
        ...(data.departamentoAtualIndex !== undefined && { departamentoAtualIndex: data.departamentoAtualIndex }),
        ...(data.fluxoDepartamentos !== undefined && { fluxoDepartamentos: data.fluxoDepartamentos }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.notasCriador !== undefined && { notasCriador: data.notasCriador }),
        ...(data.progresso !== undefined && { progresso: data.progresso }),
        ...(novoInicio !== undefined && { dataInicio: novoInicio }),
        ...(dataEntregaFoiEnviada && entregaParsed !== undefined && { dataEntrega: entregaParsed }),
        ...(entregaCalculada !== undefined && { dataEntrega: entregaCalculada }),
        dataAtualizacao: new Date(),
      },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
    });
    
    // Criar evento de alteração
    if (processoAntigo) {
      const mudancas: string[] = [];
      if (processoAntigo.status !== processo.status) {
        mudancas.push(`Status: ${processoAntigo.status} → ${processo.status}`);
      }
      if (processoAntigo.prioridade !== processo.prioridade) {
        mudancas.push(`Prioridade: ${processoAntigo.prioridade} → ${processo.prioridade}`);
      }
      if (processoAntigo.departamentoAtual !== processo.departamentoAtual) {
        mudancas.push(`Departamento alterado`);
      }
      
      if (mudancas.length > 0) {
        await prisma.historicoEvento.create({
          data: {
            processoId: processo.id,
            tipo: 'ALTERACAO',
            acao: mudancas.join(', '),
            responsavelId: user.id,
            dataTimestamp: BigInt(Date.now()),
          },
        });
      }

      const oldStatus = String(processoAntigo.status || '').toUpperCase();
      const newStatus = String(processo.status || '').toUpperCase();
      if (oldStatus !== newStatus && (newStatus === 'FINALIZADO' || newStatus === 'FINALIZACAO')) {
        await prisma.historicoEvento.create({
          data: {
            processoId: processo.id,
            tipo: 'FINALIZACAO',
            acao: 'Processo finalizado',
            responsavelId: user.id,
            departamento: 'Sistema',
            dataTimestamp: BigInt(Date.now()),
          },
        });

        // Notificação persistida para o criador
        try {
          if (processoAntigo.criadoPorId) {
            const nomeEmpresa = processo.nomeEmpresa || 'Empresa';
            const nomeServico = processo.nomeServico ? ` - ${processo.nomeServico}` : '';
            await prisma.notificacao.create({
              data: {
                usuarioId: processoAntigo.criadoPorId,
                mensagem: `Seu processo foi finalizado: ${nomeEmpresa}${nomeServico}`,
                tipo: 'SUCESSO',
                processoId: processo.id,
                link: `/`,
              },
            });
          }
        } catch (e) {
          console.error('Erro ao criar notificação de finalização:', e);
        }
      }
    }
    
    return NextResponse.json(processo);
  } catch (error) {
    console.error('Erro ao atualizar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar processo' },
      { status: 500 }
    );
  }
}

// DELETE /api/processos/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    const processoId = parseInt(params.id);

    if (roleUpper === 'USUARIO') {
      return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 });
    }

    if (roleUpper === 'GERENTE') {
      const departamentoUsuarioRaw = (user as any).departamentoId ?? (user as any).departamento_id;
      const departamentoUsuario = Number.isFinite(Number(departamentoUsuarioRaw)) ? Number(departamentoUsuarioRaw) : undefined;
      if (typeof departamentoUsuario !== 'number') {
        return NextResponse.json({ error: 'Usuário sem departamento definido' }, { status: 403 });
      }

      const processo = await prisma.processo.findUnique({ where: { id: processoId }, select: { id: true, departamentoAtual: true } });
      if (!processo) {
        return NextResponse.json({ error: 'Processo não encontrado' }, { status: 404 });
      }

      if (processo.departamentoAtual !== departamentoUsuario) {
        return NextResponse.json({ error: 'Sem permissão para excluir processo de outro departamento' }, { status: 403 });
      }
    } else if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 });
    }

    await prisma.processo.delete({ where: { id: processoId } });
    
    return NextResponse.json({ message: 'Processo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir processo:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir processo' },
      { status: 500 }
    );
  }
}




