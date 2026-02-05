import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// Função para converter data corretamente (evita problema de timezone)
function parseDate(value: string): Date {
  // Se for apenas data (YYYY-MM-DD), adiciona horário meio-dia para evitar mudança de dia por timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T12:00:00');
  }
  return new Date(value);
}

// GET - Buscar evento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    
    const evento = await (prisma as any).eventoCalendario.findUnique({
      where: { id },
    });
    
    if (!evento) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      ...evento,
      tipo: evento.tipo.toLowerCase(),
      status: evento.status.toLowerCase(),
      recorrencia: evento.recorrencia.toLowerCase(),
    });
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar evento' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar evento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const body = await request.json();
    
    const {
      titulo,
      descricao,
      tipo,
      status,
      dataInicio,
      dataFim,
      diaInteiro,
      cor,
      processoId,
      empresaId,
      departamentoId,
      recorrencia,
      recorrenciaFim,
      alertaMinutosAntes,
    } = body;
    
    const evento = await (prisma as any).eventoCalendario.update({
      where: { id },
      data: {
        ...(titulo && { titulo }),
        ...(descricao !== undefined && { descricao }),
        ...(tipo && { tipo: tipo.toUpperCase() }),
        ...(status && { status: status.toUpperCase() }),
        ...(dataInicio && { dataInicio: parseDate(dataInicio) }),
        ...(dataFim !== undefined && { dataFim: dataFim ? parseDate(dataFim) : null }),
        ...(diaInteiro !== undefined && { diaInteiro }),
        ...(cor !== undefined && { cor }),
        ...(processoId !== undefined && { processoId: processoId ? Number(processoId) : null }),
        ...(empresaId !== undefined && { empresaId: empresaId ? Number(empresaId) : null }),
        ...(departamentoId !== undefined && { departamentoId: departamentoId ? Number(departamentoId) : null }),
        ...(recorrencia && { recorrencia: recorrencia.toUpperCase() }),
        ...(recorrenciaFim !== undefined && { recorrenciaFim: recorrenciaFim ? new Date(recorrenciaFim) : null }),
        ...(alertaMinutosAntes !== undefined && { alertaMinutosAntes }),
      },
    });
    
    return NextResponse.json({
      ...evento,
      tipo: evento.tipo.toLowerCase(),
      status: evento.status.toLowerCase(),
      recorrencia: evento.recorrencia.toLowerCase(),
    });
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar evento' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir evento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    
    await (prisma as any).eventoCalendario.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir evento' },
      { status: 500 }
    );
  }
}
