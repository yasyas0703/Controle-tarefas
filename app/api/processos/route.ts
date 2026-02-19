import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

function parseDateMaybe(value: any): Date | undefined {
  if (!value) return undefined;
  // Se for string no formato YYYY-MM-DD, adiciona horário ao meio-dia para evitar problemas de timezone
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sanitizeJson(value: any): any {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJson);
  }
  if (value && typeof value === 'object') {
    // Preserva Date
    if (value instanceof Date) return value;
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeJson(v);
    return out;
  }
  return value;
}

function toPrismaStatus(status: string) {
  const s = String(status).trim();
  if (!s) return s as any;
  // aceita 'em_andamento' e 'EM_ANDAMENTO'
  return s === s.toLowerCase() ? s.toUpperCase() : s;
}

// GET /api/processos
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const departamentoId = searchParams.get('departamentoId');
    const empresaId = searchParams.get('empresaId');
    const liteParam = searchParams.get('lite');
    const lite = liteParam === null ? true : !(liteParam === '0' || liteParam.toLowerCase() === 'false');
    
    const baseWhere = {
      ...(status && { status: toPrismaStatus(status) as any }),
      ...(departamentoId && { departamentoAtual: parseInt(departamentoId) }),
      ...(empresaId && { empresaId: parseInt(empresaId) }),
    };

    const processos = await prisma.processo.findMany({
      where: baseWhere,
      include: lite
        ? {
            empresa: true,
            ...({ responsavel: { select: { id: true, nome: true, email: true } } } as any),
            tags: { include: { tag: true } },
            _count: { select: { comentarios: true, documentos: true } },
            criadoPor: { select: { id: true, nome: true, email: true } },
          }
        : {
            empresa: true,
            // `responsavel` é um campo recém-adicionado; em alguns ambientes o TS pode resolver um Prisma Client antigo.
            // O cast mantém o runtime correto e evita erro de "excess property".
            ...({ responsavel: { select: { id: true, nome: true, email: true } } } as any),
            tags: {
              include: { tag: true },
            },
            comentarios: {
              include: { autor: { select: { id: true, nome: true, email: true } } },
              orderBy: { criadoEm: 'desc' },
              take: 5,
            },
            documentos: {
              take: 5,
            },
            historicoEventos: {
              include: { responsavel: { select: { id: true, nome: true } } },
              orderBy: { data: 'desc' },
              take: 10,
            },
            criadoPor: {
              select: { id: true, nome: true, email: true },
            },
          },
      orderBy: { dataCriacao: 'desc' },
    });

    // Filtrar documentos por visibilidade para o usuário autenticado
    const userId = Number((user as any).id);
    const userRole = String((user as any).role || '').toUpperCase();
    const documentoPodeSerVisto = (doc: any) => {
      try {
        const vis = String(doc.visibility || 'PUBLIC').toUpperCase();
        const allowedRoles: string[] = Array.isArray(doc.allowedRoles) ? doc.allowedRoles.map(r => String(r).toUpperCase()) : [];
        const allowedUserIds: number[] = Array.isArray(doc.allowedUserIds) ? doc.allowedUserIds.map((n: any) => Number(n)) : [];

        if (vis === 'PUBLIC') return true;
        if (vis === 'ROLES') {
          if (allowedRoles.length === 0) return false;
          return allowedRoles.includes(userRole);
        }
        if (vis === 'USERS') {
          if (allowedUserIds.length === 0) return false;
          return allowedUserIds.includes(userId);
        }
        return Array.isArray(allowedUserIds) && allowedUserIds.includes(userId);
      } catch (e) {
        return false;
      }
    };

    for (const p of processos) {
      if (Array.isArray((p as any).documentos)) {
        (p as any).documentos = (p as any).documentos.filter((d: any) => documentoPodeSerVisto(d));
      }
    }

    // NextResponse.json usa JSON.stringify internamente e quebra com BigInt.
    // Replacer garante serialização segura (ex.: documentos.tamanho, historicoEventos.dataTimestamp).
    const body = JSON.stringify(processos, (_key, value) =>
      typeof value === 'bigint'
        ? (value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString())
        : value
    );
    return new NextResponse(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao buscar processos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar processos' },
      { status: 500 }
    );
  }
}

// POST /api/processos
export async function POST(request: NextRequest) {

  try {
    const t0 = Date.now();
    console.log('[LOG] INÍCIO POST /api/processos', t0);

    const { user, error } = await requireAuth(request);
    if (!user) return error;
    console.log('[LOG] requireAuth:', Date.now() - t0, 'ms');

    const data = await request.json();
    console.log('[LOG] request.json:', Date.now() - t0, 'ms');

    const roleUpper = String((user as any).role || '').toUpperCase();
    const departamentoUsuarioRaw = (user as any).departamentoId ?? (user as any).departamento_id;
    const departamentoUsuario = Number.isFinite(Number(departamentoUsuarioRaw)) ? Number(departamentoUsuarioRaw) : undefined;

    const fluxoRaw: any[] = Array.isArray(data?.fluxoDepartamentos) ? data.fluxoDepartamentos : [];
    const fluxoParsed: number[] = fluxoRaw.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x));

    const departamentoAtualParsed = Number(data?.departamentoAtual);
    const departamentoAtualNum = Number.isFinite(departamentoAtualParsed) ? departamentoAtualParsed : undefined;

    // Garante que o processo sempre nasce em um departamento ATIVO e existente.
    // Isso evita casos em que o template tem ids antigos/inválidos e a solicitação "some" do kanban.
    // Paraleliza busca de departamentos e gerentes (se possível)
    const departamentosPromise = prisma.departamento.findMany({
      where: { ativo: true },
      select: { id: true },
      orderBy: { ordem: 'asc' },
    });

    // Só pode buscar gerentes depois de saber o departamentoInicial, então paralelização só é possível para departamentos
    const departamentosAtivos = await departamentosPromise;
    console.log('[LOG] prisma.departamento.findMany:', Date.now() - t0, 'ms');
    const deptIds = new Set<number>(departamentosAtivos.map((d) => d.id));

    const fluxo = fluxoParsed.filter((id) => deptIds.has(id));
    const departamentoInicial =
      (typeof departamentoAtualNum === 'number' && deptIds.has(departamentoAtualNum)
        ? departamentoAtualNum
        : fluxo[0] ?? departamentosAtivos[0]?.id);

    if (!departamentoInicial || !Number.isFinite(departamentoInicial)) {
      console.log('[LOG] Departamento inicial inválido:', Date.now() - t0, 'ms');
      return NextResponse.json({ error: 'Departamento inicial inválido' }, { status: 400 });
    }

    const fluxoFinal = fluxo.length > 0 ? fluxo : [departamentoInicial];
    const idxInicial = Math.max(0, fluxoFinal.indexOf(departamentoInicial));

    const personalizado = Boolean(data?.personalizado);

    // Usuário normal NÃO pode criar solicitação personalizada
    if (personalizado && roleUpper === 'USUARIO') {
      console.log('[LOG] Sem permissão para criar solicitação personalizada:', Date.now() - t0, 'ms');
      return NextResponse.json(
        { error: 'Sem permissão para criar solicitação personalizada' },
        { status: 403 }
      );
    }

    // Usuário comum pode criar solicitação (inclusive personalizada) desde que o fluxo comece no dept dele
    // (a validação por departamento acontece abaixo).

    // Usuário comum e gerente devem ter departamento definido
    if ((roleUpper === 'USUARIO' || roleUpper === 'GERENTE') && typeof departamentoUsuario !== 'number') {
      console.log('[LOG] Usuário sem departamento definido:', Date.now() - t0, 'ms');
      return NextResponse.json({ error: 'Usuário sem departamento definido' }, { status: 403 });
    }

    // Usuário comum e gerente: só podem criar solicitação cujo primeiro dept seja o deles
    if ((roleUpper === 'USUARIO' || roleUpper === 'GERENTE') && departamentoInicial !== departamentoUsuario) {
      console.log('[LOG] Sem permissão para criar solicitação para outro departamento:', Date.now() - t0, 'ms');
      return NextResponse.json({ error: 'Sem permissão para criar solicitação para outro departamento' }, { status: 403 });
    }

    const toTipoCampo = (tipo: any) => {
      const t = String(tipo || '').trim().toLowerCase();
      switch (t) {
        case 'text':
          return 'TEXT';
        case 'textarea':
          return 'TEXTAREA';
        case 'number':
          return 'NUMBER';
        case 'date':
          return 'DATE';
        case 'boolean':
          return 'BOOLEAN';
        case 'select':
          return 'SELECT';
        case 'checkbox':
          return 'CHECKBOX';
        case 'file':
          return 'FILE';
        case 'phone':
          return 'PHONE';
        case 'email':
          return 'EMAIL';
        default:
          // Prisma enum default
          return 'TEXT';
      }
    };
    
    const dataInicio = parseDateMaybe(data?.dataInicio) ?? new Date();
    const dataEntrega = parseDateMaybe(data?.dataEntrega) ?? addDays(dataInicio, 15);

    const responsavelIdRaw = data?.responsavelId;
    let responsavelId = Number.isFinite(Number(responsavelIdRaw)) ? Number(responsavelIdRaw) : undefined;

    let responsavelNome: string | undefined;
    let responsavelAtivoId: number | undefined;

    // Se veio responsavelId, valida se existe e está ativo
    if (typeof responsavelId === 'number') {
      const tResp = Date.now();
      const resp = await prisma.usuario.findUnique({ where: { id: responsavelId }, select: { id: true, ativo: true, nome: true } });
      console.log('[LOG] prisma.usuario.findUnique:', Date.now() - t0, 'ms');
      if (!resp || !resp.ativo) {
        console.log('[LOG] Responsável inválido:', Date.now() - t0, 'ms');
        return NextResponse.json({ error: 'Responsável inválido' }, { status: 400 });
      }
      responsavelNome = resp.nome;
      responsavelAtivoId = resp.id;
    } else {
      // Auto-assign: busca o gerente do departamento inicial
      try {
        const gerente = await prisma.usuario.findFirst({
          where: {
            departamentoId: departamentoInicial,
            role: 'GERENTE',
            ativo: true,
          },
          select: { id: true, nome: true },
        });
        if (gerente) {
          responsavelId = gerente.id;
          responsavelNome = gerente.nome;
          responsavelAtivoId = gerente.id;
          console.log('[LOG] Auto-assign gerente do departamento inicial:', gerente.nome);
        }
      } catch (e) {
        console.log('[LOG] Erro ao buscar gerente para auto-assign:', e);
      }
    }

    const tProcesso = Date.now();
    // Agrupa as escritas principais em uma transação para reduzir overhead
    const processo = await prisma.$transaction(async (tx) => {
      const proc = await tx.processo.create({
        data: {
          nome: data.nome || null,
          nomeServico: data.nomeServico || null,
          nomeEmpresa: data.nomeEmpresa,
          cliente: String(data.cliente || '').trim() || responsavelNome || null,
          email: data.email || null,
          telefone: data.telefone || null,
          ...(typeof responsavelId === 'number' ? { responsavelId } : {}),
          ...(data.empresaId != null ? { empresaId: data.empresaId } : {}),
          status: data.status || 'EM_ANDAMENTO',
          prioridade: data.prioridade || 'MEDIA',
          departamentoAtual: departamentoInicial,
          departamentoAtualIndex: Number.isFinite(Number(data?.departamentoAtualIndex)) ? Number(data.departamentoAtualIndex) : idxInicial,
          fluxoDepartamentos: fluxoFinal,
          descricao: data.descricao || null,
          notasCriador: data.notasCriador || null,
          criadoPorId: user.id,
          progresso: data.progresso || 0,
          dataInicio,
          dataEntrega,
          // Interligação e independência de departamentos
          ...(data.interligadoComId ? { interligadoComId: Number(data.interligadoComId) } : {}),
          ...(data.interligadoNome ? { interligadoNome: String(data.interligadoNome) } : {}),
          ...(data.interligadoParalelo != null ? { interligadoParalelo: Boolean(data.interligadoParalelo) } : {}),
          ...(data.deptIndependente != null ? { deptIndependente: Boolean(data.deptIndependente) } : {}),
        },
        select: {
          id: true,
          nome: true,
          nomeServico: true,
          nomeEmpresa: true,
          cliente: true,
          email: true,
          telefone: true,
          responsavelId: true,
          empresaId: true,
          status: true,
          prioridade: true,
          departamentoAtual: true,
          departamentoAtualIndex: true,
          fluxoDepartamentos: true,
          descricao: true,
          notasCriador: true,
          criadoPorId: true,
          progresso: true,
          dataInicio: true,
          dataEntrega: true,
          interligadoComId: true,
          interligadoNome: true,
          interligadoParalelo: true,
          deptIndependente: true,
        },
      });
      return proc;
    });
    console.log('[LOG] prisma.processo.create:', Date.now() - t0, 'ms');

    // Se deptIndependente, criar entradas de checklist para cada departamento do fluxo
    if (data.deptIndependente && Array.isArray(fluxoFinal) && fluxoFinal.length > 1) {
      try {
        await (prisma as any).checklistDepartamento.createMany({
          data: fluxoFinal
            .map((deptId: any) => Number(deptId))
            .filter((deptId: number) => Number.isFinite(deptId) && deptId > 0)
            .map((deptId: number) => ({
              processoId: processo.id,
              departamentoId: deptId,
              concluido: false,
            })),
          skipDuplicates: true,
        });
      } catch (e) {
        console.error('Erro ao criar checklist inicial:', e);
      }
    }

    // Notificação persistida: somente gerentes do departamento e responsável (se definido)
    try {
      const tNotif = Date.now();
      // gerentes do dept inicial
      const gerentes = await prisma.usuario.findMany({
        where: {
          ativo: true,
          role: 'GERENTE',
          departamentoId: departamentoInicial,
        },
        select: { id: true },
      });
      console.log('[LOG] prisma.usuario.findMany (gerentes):', Date.now() - t0, 'ms');

      const ids = new Set<number>(gerentes.map((g) => g.id));

      // responsável escolhido (já validado acima)
      if (typeof responsavelAtivoId === 'number') ids.add(responsavelAtivoId);

      // não notifica o próprio criador
      ids.delete(user.id);
      const destinatarios = Array.from(ids).map((id) => ({ id }));

      if (destinatarios.length > 0) {
        const nomeEmpresa = processo.nomeEmpresa || 'Empresa';
        const nomeServico = processo.nomeServico ? ` - ${processo.nomeServico}` : '';
        const mensagem = `Nova solicitação criada: ${nomeEmpresa}${nomeServico}`;

        await prisma.notificacao.createMany({
          data: destinatarios.map((u) => ({
            usuarioId: u.id,
            mensagem,
            tipo: 'INFO',
            processoId: processo.id,
            link: `/`,
          })),
        });
        console.log('[LOG] prisma.notificacao.createMany:', Date.now() - t0, 'ms');
      }
    } catch (e) {
      console.error('Erro ao criar notificações de criação:', e);
    }

    // Persistir questionários por departamento (se fornecido pelo front)
    // Estrutura esperada: { [departamentoId]: Questionario[] }
    // OBS: o front usa ids temporários (Date.now()). Aqui criamos as perguntas e mapeamos
    // os ids temporários para os ids reais para manter as condições funcionando.
    try {
      const tQuestionario = Date.now();
      const qpd = data?.questionariosPorDepartamento;
      if (qpd && typeof qpd === 'object') {
        await prisma.$transaction(async (tx) => {
          for (const [deptIdRaw, perguntasRaw] of Object.entries(qpd as Record<string, any>)) {
            const departamentoId = Number(deptIdRaw);
            if (!Number.isFinite(departamentoId) || departamentoId <= 0) continue;

            const perguntas = Array.isArray(perguntasRaw) ? perguntasRaw : [];
            const idMap = new Map<number, number>();
            const pendentesCondicao: Array<{
              createdId: number;
              condicao: { perguntaId: number; operador?: string; valor?: string };
            }> = [];

            for (let i = 0; i < perguntas.length; i++) {
              const p: any = perguntas[i] || {};
              const label = String(p.label ?? '').trim();
              if (!label) continue;

              const opcoes = Array.isArray(p.opcoes)
                ? p.opcoes
                    .map((x: any) => String(x ?? '').trim())
                    .filter((x: string) => x.length > 0)
                : [];

              const ordem = Number.isFinite(Number(p.ordem)) ? Number(p.ordem) : i;
              const originalId = Number(p.id);

              const created = await tx.questionarioDepartamento.create({
                data: {
                  processoId: processo.id,
                  departamentoId,
                  label,
                  tipo: toTipoCampo(p.tipo) as any,
                  obrigatorio: Boolean(p.obrigatorio),
                  ordem,
                  opcoes,
                  // Condição será resolvida em um segundo passo (ids reais)
                  condicaoPerguntaId: null,
                  condicaoOperador: null,
                  condicaoValor: null,
                },
              });

              if (Number.isFinite(originalId)) {
                idMap.set(originalId, created.id);
              }

              if (p?.condicao?.perguntaId) {
                pendentesCondicao.push({
                  createdId: created.id,
                  condicao: {
                    perguntaId: Number(p.condicao.perguntaId),
                    operador: p?.condicao?.operador ? String(p.condicao.operador) : undefined,
                    valor: p?.condicao?.valor ? String(p.condicao.valor) : undefined,
                  },
                });
              }
            }

            for (const item of pendentesCondicao) {
              const mapped = idMap.get(Number(item.condicao.perguntaId));
              await tx.questionarioDepartamento.update({
                where: { id: item.createdId },
                data: {
                  condicaoPerguntaId: mapped ?? null,
                  condicaoOperador: item.condicao.operador ?? null,
                  condicaoValor: item.condicao.valor ?? null,
                },
              });
            }
          }
        });
        console.log('[LOG] prisma.$transaction (questionarios):', Date.now() - t0, 'ms');
      }
    } catch (e) {
      // Não quebra a criação do processo caso falhe ao persistir questionários
      console.warn('Aviso: falha ao persistir questionários do processo:', e);
    }
    
    // Criar histórico inicial
    const tHistorico = Date.now();
    await prisma.historicoEvento.create({
      data: {
        processoId: processo.id,
        tipo: 'INICIO',
        acao: `Solicitação criada: ${processo.nomeServico || 'Solicitação'}`,
        responsavelId: user.id,
        departamento: 'Sistema',
        dataTimestamp: BigInt(Date.now()),
      },
    });
    console.log('[LOG] prisma.historicoEvento.create:', Date.now() - t0, 'ms');

    // Se o processo é interligado com outro, registrar eventos de interligação em ambos
    if (data.interligadoComId) {
      const origemId = Number(data.interligadoComId);
      const origemNome = data.interligadoNome ? String(data.interligadoNome) : `#${origemId}`;
      const novoNome = processo.nomeServico || processo.nomeEmpresa || `#${processo.id}`;
      try {
        // Evento no processo NOVO: "Continuação de..."
        await prisma.historicoEvento.create({
          data: {
            processoId: processo.id,
            tipo: 'ALTERACAO',
            acao: `🔗 Solicitação interligada — continuação de: ${origemNome}`,
            responsavelId: user.id,
            departamento: 'Sistema',
            dataTimestamp: BigInt(Date.now() + 1),
          },
        });
        // Evento no processo ORIGEM: "Nova solicitação criada como continuação"
        await prisma.historicoEvento.create({
          data: {
            processoId: origemId,
            tipo: 'ALTERACAO',
            acao: `🔗 Nova solicitação interligada criada: ${novoNome} (#${processo.id})`,
            responsavelId: user.id,
            departamento: 'Sistema',
            dataTimestamp: BigInt(Date.now() + 2),
          },
        });
        // Registrar na tabela InterligacaoProcesso
        await (prisma as any).interligacaoProcesso.create({
          data: {
            processoOrigemId: origemId,
            processoDestinoId: processo.id,
            criadoPorId: user.id,
            automatica: true,
          },
        }).catch(() => { /* ignora se já existe */ });
        console.log('[LOG] interligação registrada:', Date.now() - t0, 'ms');
      } catch (e) {
        console.error('Erro ao registrar interligação no histórico:', e);
      }
    }
    
    // Criar histórico de fluxo inicial
    if (data.departamentoAtual) {
      await prisma.historicoFluxo.create({
        data: {
          processoId: processo.id,
          departamentoId: data.departamentoAtual,
          ordem: 0,
          status: 'em_andamento',
          entradaEm: new Date(),
        },
      });
      console.log('[LOG] prisma.historicoFluxo.create:', Date.now() - t0, 'ms');
    }
    
    console.log('[LOG] FIM POST /api/processos:', Date.now() - t0, 'ms');
    return NextResponse.json(processo, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar processo:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Erro ao criar processo: ${errorMsg}` },
      { status: 500 }
    );
  }
}




