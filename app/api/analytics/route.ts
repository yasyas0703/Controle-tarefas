import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';
export const fetchCache = 'force-no-store';

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// GET /api/analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodoParam = searchParams.get('periodo') || '30'; // dias
    const periodo = Number.parseInt(periodoParam, 10);
    const periodoDias = Number.isFinite(periodo) && periodo > 0 ? periodo : 30;
    
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodoDias);
    
    // Total de processos
    const totalProcessos = await prisma.processo.count();
    
    // Processos por status
    const processosPorStatus = await prisma.processo.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    
    // Processos por departamento
    const processosPorDepartamento = await prisma.processo.groupBy({
      by: ['departamentoAtual'],
      _count: { id: true },
    });
    
    // Processos criados no período
    const processosCriadosPeriodo = await prisma.processo.count({
      where: {
        dataCriacao: {
          gte: dataInicio,
        },
      },
    });
    
    // Processos finalizados no período
    const processosFinalizadosPeriodo = await prisma.processo.count({
      where: {
        status: 'FINALIZADO',
        dataFinalizacao: {
          gte: dataInicio,
        },
      },
    });

    // Processos criados no período e finalizados no período (taxa não passa de 100%)
    const processosFinalizadosCriadosPeriodo = await prisma.processo.count({
      where: {
        status: 'FINALIZADO',
        dataCriacao: {
          gte: dataInicio,
        },
        dataFinalizacao: {
          gte: dataInicio,
        },
      },
    });
    
    // Tempo médio por departamento
    const historicosFluxo = await prisma.historicoFluxo.findMany({
      where: {
        entradaEm: {
          gte: dataInicio,
        },
        saidaEm: {
          not: null,
        },
      },
      include: {
        departamento: true,
      },
    });
    
    const tempoPorDepartamento: Record<string, number[]> = {};
    historicosFluxo.forEach((hf) => {
      if (hf.saidaEm && hf.departamento) {
        const tempo = hf.saidaEm.getTime() - hf.entradaEm.getTime();
        const dias = tempo / (1000 * 60 * 60 * 24);
        
        if (!tempoPorDepartamento[hf.departamento.nome]) {
          tempoPorDepartamento[hf.departamento.nome] = [];
        }
        tempoPorDepartamento[hf.departamento.nome].push(dias);
      }
    });
    
    const tempoMedioPorDepartamento = Object.entries(tempoPorDepartamento).map(
      ([nome, tempos]) => ({
        departamento: nome,
        tempoMedioDias: tempos.reduce((a, b) => a + b, 0) / tempos.length,
        totalProcessos: tempos.length,
      })
    );

    const todosTempos = Object.values(tempoPorDepartamento).flat();
    const tempoMedioTotalDias =
      todosTempos.length > 0
        ? todosTempos.reduce((a, b) => a + b, 0) / todosTempos.length
        : 0;
    
    // Taxa de conclusão
    const taxaConclusao =
      processosCriadosPeriodo > 0
        ? (processosFinalizadosCriadosPeriodo / processosCriadosPeriodo) * 100
        : 0;
    
    return NextResponse.json({
      totalProcessos,
      processosPorStatus: processosPorStatus.map((p) => ({
        status: typeof p.status === 'string' ? p.status.toLowerCase() : p.status,
        quantidade: p._count.id,
      })),
      processosPorDepartamento: processosPorDepartamento.map((p) => ({
        departamentoId: p.departamentoAtual,
        quantidade: p._count.id,
      })),
      processosCriadosPeriodo,
      processosFinalizadosPeriodo,
      processosFinalizadosCriadosPeriodo,
      tempoMedioPorDepartamento,
      tempoMedioTotalDias: round2(tempoMedioTotalDias),
      taxaConclusao: round2(taxaConclusao),
      periodo: periodoDias,
    });
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar analytics' },
      { status: 500 }
    );
  }
}



