import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';

// GET /api/comentarios?processoId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const processoId = searchParams.get('processoId');
    
    if (!processoId) {
      return NextResponse.json(
        { error: 'processoId é obrigatório' },
        { status: 400 }
      );
    }
    
    const comentarios = await prisma.comentario.findMany({
      where: { processoId: parseInt(processoId) },
      include: {
        autor: {
          select: { id: true, nome: true, email: true },
        },
        departamento: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });
    
    return NextResponse.json(comentarios);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar comentários' },
      { status: 500 }
    );
  }
}

// POST /api/comentarios
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const data = await request.json();
    
    const comentario = await prisma.comentario.create({
      data: {
        processoId: data.processoId,
        texto: data.texto,
        autorId: parseInt(userId),
        departamentoId: data.departamentoId,
        mencoes: data.mencoes || [],
      },
      include: {
        autor: {
          select: { id: true, nome: true, email: true },
        },
        departamento: {
          select: { id: true, nome: true },
        },
      },
    });
    
    // Criar evento no histórico
    await prisma.historicoEvento.create({
      data: {
        processoId: data.processoId,
        tipo: 'COMENTARIO',
        acao: 'Comentário adicionado',
        responsavelId: parseInt(userId),
        dataTimestamp: BigInt(Date.now()),
      },
    });
    
    return NextResponse.json(comentario, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return NextResponse.json(
      { error: 'Erro ao criar comentário' },
      { status: 500 }
    );
  }
}



