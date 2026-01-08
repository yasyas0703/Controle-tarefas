import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// GET /api/processos
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const departamentoId = searchParams.get('departamentoId');
    const empresaId = searchParams.get('empresaId');
    
    const processos = await prisma.processo.findMany({
      where: {
        ...(status && { status: status as any }),
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
          orderBy: { data: 'desc' },
          take: 10,
        },
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
      orderBy: { dataCriacao: 'desc' },
    });
    
    return NextResponse.json(processos);
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
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const data = await request.json();
    
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
        criadoPorId: parseInt(userId),
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
    
    // Criar histórico inicial
    await prisma.historicoEvento.create({
      data: {
        processoId: processo.id,
        tipo: 'INICIO',
        acao: `Solicitação criada: ${processo.nomeServico || 'Solicitação'}`,
        responsavelId: parseInt(userId),
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

