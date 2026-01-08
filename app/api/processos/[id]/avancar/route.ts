import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// POST /api/processos/:id/avancar
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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
        responsavelId: parseInt(userId),
        departamento: proximoDepartamento.nome,
        dataTimestamp: BigInt(Date.now()),
      },
    });
    
    // Se é o último departamento, marcar como concluído
    if (proximoIndex === processo.fluxoDepartamentos.length - 1) {
      await prisma.processo.update({
        where: { id: processoId },
        data: {
          status: 'FINALIZADO',
          dataFinalizacao: new Date(),
        },
      });
      
      await prisma.historicoEvento.create({
        data: {
          processoId: processoId,
          tipo: 'FINALIZACAO',
          acao: 'Processo concluído',
          responsavelId: parseInt(userId),
          departamento: proximoDepartamento.nome,
          dataTimestamp: BigInt(Date.now()),
        },
      });
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

