import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

const toTipoCampo = (tipo: any) => {
  const t = String(tipo || '').trim().toUpperCase();
  // aceita enum do Prisma (TEXT, TEXTAREA...) ou tipos do UI (text, textarea...)
  switch (t) {
    case 'TEXT':
    case 'TEXTAREA':
    case 'NUMBER':
    case 'DATE':
    case 'BOOLEAN':
    case 'SELECT':
    case 'FILE':
    case 'PHONE':
    case 'EMAIL':
      return t;
    case 'TEXTAREA':
      return 'TEXTAREA';
    default: {
      const low = String(tipo || '').trim().toLowerCase();
      switch (low) {
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
          return 'TEXT';
      }
    }
  }
};

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

// PUT /api/questionarios - sincronizar perguntas de um processo+departamento
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    // Permite admin/gerente editar questionários
    if (!requireRole(user, ['ADMIN', 'GERENTE'])) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { processoId, departamentoId, perguntas } = await request.json();
    const pid = Number(processoId);
    const did = Number(departamentoId);

    if (!Number.isFinite(pid) || !Number.isFinite(did) || did <= 0 || pid <= 0) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const list = Array.isArray(perguntas) ? perguntas : [];

    const result = await prisma.$transaction(async (tx) => {
      const existentes = await tx.questionarioDepartamento.findMany({
        where: { processoId: pid, departamentoId: did },
        select: { id: true },
      });
      const existentesIds = new Set(existentes.map((e) => e.id));

      const idMap = new Map<number, number>();
      const keptIds: number[] = [];
      const pendentesCondicao: Array<{ id: number; condicao: any }> = [];

      // 1) create/update sem condição (resolveremos depois)
      for (let i = 0; i < list.length; i++) {
        const p: any = list[i] || {};
        const originalId = Number(p.id);
        const label = String(p.label ?? '').trim();
        if (!label) continue;

        const opcoes = Array.isArray(p.opcoes)
          ? p.opcoes.map((x: any) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
          : [];
        const ordem = Number.isFinite(Number(p.ordem)) ? Number(p.ordem) : i;
        const tipo = toTipoCampo(p.tipo);
        const obrigatorio = Boolean(p.obrigatorio);

        if (Number.isFinite(originalId) && existentesIds.has(originalId)) {
          await tx.questionarioDepartamento.update({
            where: { id: originalId },
            data: {
              label,
              tipo: tipo as any,
              obrigatorio,
              ordem,
              opcoes,
              condicaoPerguntaId: null,
              condicaoOperador: null,
              condicaoValor: null,
            },
          });
          idMap.set(originalId, originalId);
          keptIds.push(originalId);
          if (p?.condicao?.perguntaId) pendentesCondicao.push({ id: originalId, condicao: p.condicao });
        } else {
          const created = await tx.questionarioDepartamento.create({
            data: {
              processoId: pid,
              departamentoId: did,
              label,
              tipo: tipo as any,
              obrigatorio,
              ordem,
              opcoes,
              condicaoPerguntaId: null,
              condicaoOperador: null,
              condicaoValor: null,
            },
          });
          if (Number.isFinite(originalId)) idMap.set(originalId, created.id);
          keptIds.push(created.id);
          if (p?.condicao?.perguntaId) pendentesCondicao.push({ id: created.id, condicao: p.condicao });
        }
      }

      // 2) aplicar condições (convertendo ids temporários -> ids reais)
      for (const item of pendentesCondicao) {
        const perguntaIdOrig = Number(item.condicao?.perguntaId);
        const mapped = idMap.get(perguntaIdOrig);
        await tx.questionarioDepartamento.update({
          where: { id: item.id },
          data: {
            condicaoPerguntaId: mapped ?? null,
            condicaoOperador: item.condicao?.operador ? String(item.condicao.operador) : null,
            condicaoValor: item.condicao?.valor ? String(item.condicao.valor) : null,
          },
        });
      }

      // 3) remover perguntas que não estão mais na lista
      await tx.questionarioDepartamento.deleteMany({
        where: {
          processoId: pid,
          departamentoId: did,
          ...(keptIds.length > 0 ? { id: { notIn: keptIds } } : {}),
        },
      });

      const atualizado = await tx.questionarioDepartamento.findMany({
        where: { processoId: pid, departamentoId: did },
        orderBy: { ordem: 'asc' },
      });
      return atualizado;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao sincronizar questionários:', error);
    return NextResponse.json({ error: 'Erro ao salvar questionários' }, { status: 500 });
  }
}




