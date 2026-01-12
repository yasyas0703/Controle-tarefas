import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';

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
    
    const processos = await prisma.processo.findMany({
      where: {
        ...(status && { status: toPrismaStatus(status) as any }),
        ...(departamentoId && { departamentoAtual: parseInt(departamentoId) }),
        ...(empresaId && { empresaId: parseInt(empresaId) }),
      },
      include: {
        empresa: true,
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
    const { user, error } = await requireAuth(request);
    if (!user) return error;
    
    const data = await request.json();

    const roleUpper = String((user as any).role || '').toUpperCase();
    const departamentoUsuario = (user as any).departamento_id;

    const fluxo: number[] = Array.isArray(data?.fluxoDepartamentos)
      ? data.fluxoDepartamentos.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x))
      : [];
    const departamentoInicial = Number(
      Number.isFinite(Number(data?.departamentoAtual))
        ? Number(data.departamentoAtual)
        : fluxo.length > 0
          ? fluxo[0]
          : NaN
    );

    const personalizado = Boolean(data?.personalizado);

    // Usuário comum: pode criar via templates, mas não personalizada
    if (roleUpper === 'USUARIO' && personalizado) {
      return NextResponse.json({ error: 'Sem permissão para criar solicitação personalizada' }, { status: 403 });
    }

    // Usuário comum e gerente: só podem criar solicitação cujo primeiro dept seja o deles
    if ((roleUpper === 'USUARIO' || roleUpper === 'GERENTE') && typeof departamentoUsuario === 'number' && Number.isFinite(departamentoInicial)) {
      if (departamentoInicial !== departamentoUsuario) {
        return NextResponse.json({ error: 'Sem permissão para criar solicitação para outro departamento' }, { status: 403 });
      }
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
    
    const processo = await prisma.processo.create({
      data: {
        nome: data.nome,
        nomeServico: data.nomeServico,
        nomeEmpresa: data.nomeEmpresa,
        cliente: data.cliente,
        email: data.email,
        telefone: data.telefone,
        empresaId: data.empresaId,
        status: data.status || 'EM_ANDAMENTO',
        prioridade: data.prioridade || 'MEDIA',
        departamentoAtual: data.departamentoAtual,
        departamentoAtualIndex: data.departamentoAtualIndex || 0,
        fluxoDepartamentos: data.fluxoDepartamentos || [],
        descricao: data.descricao,
        notasCriador: data.notasCriador,
        criadoPorId: user.id,
        progresso: data.progresso || 0,
      },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    // Persistir questionários por departamento (se fornecido pelo front)
    // Estrutura esperada: { [departamentoId]: Questionario[] }
    // OBS: o front usa ids temporários (Date.now()). Aqui criamos as perguntas e mapeamos
    // os ids temporários para os ids reais para manter as condições funcionando.
    try {
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
      }
    } catch (e) {
      // Não quebra a criação do processo caso falhe ao persistir questionários
      console.warn('Aviso: falha ao persistir questionários do processo:', e);
    }
    
    // Criar histórico inicial
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
    }
    
    return NextResponse.json(processo, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao criar processo' },
      { status: 500 }
    );
  }
}




