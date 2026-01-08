import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// GET /api/analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || '30'; // dias
    
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(periodo));
    
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
    
    // Taxa de conclusão
    const taxaConclusao =
      totalProcessos > 0
        ? (processosFinalizadosPeriodo / processosCriadosPeriodo) * 100
        : 0;
    
    return NextResponse.json({
      totalProcessos,
      processosPorStatus: processosPorStatus.map((p) => ({
        status: p.status,
        quantidade: p._count.id,
      })),
      processosPorDepartamento: processosPorDepartamento.map((p) => ({
        departamentoId: p.departamentoAtual,
        quantidade: p._count.id,
      })),
      processosCriadosPeriodo,
      processosFinalizadosPeriodo,
      tempoMedioPorDepartamento,
      taxaConclusao: Math.round(taxaConclusao * 100) / 100,
      periodo: parseInt(periodo),
    });
  } catch (error) {
    console.error('Erro ao buscar analytics:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar analytics' },
      { status: 500 }
    );
  }
}

