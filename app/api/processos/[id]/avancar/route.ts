import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';

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
      const departamentoUsuario = (user as any).departamento_id;
      if (typeof departamentoUsuario === 'number' && processo.departamentoAtual !== departamentoUsuario) {
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
    
    return NextResponse.json(processoAtualizado);
  } catch (error) {
    console.error('Erro ao avançar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao avançar processo' },
      { status: 500 }
    );
  }
}

