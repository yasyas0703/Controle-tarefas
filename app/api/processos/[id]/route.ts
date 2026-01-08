import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// GET /api/processos/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const processo = await prisma.processo.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
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
      return NextResponse.json(
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(processo);
  } catch (error) {
    console.error('Erro ao buscar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar processo' },
      { status: 500 }
    );
  }
}

// PUT /api/processos/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Buscar processo atual para comparar mudanças
    const processoAntigo = await prisma.processo.findUnique({
      where: { id: parseInt(params.id) },
    });
    
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
            responsavelId: parseInt(userId),
            dataTimestamp: BigInt(Date.now()),
          },
        });
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
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    // Apenas ADMIN pode excluir
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Sem permissão para excluir' },
        { status: 403 }
      );
    }
    
    await prisma.processo.delete({
      where: { id: parseInt(params.id) },
    });
    
    return NextResponse.json({ message: 'Processo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir processo:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir processo' },
      { status: 500 }
    );
  }
}

