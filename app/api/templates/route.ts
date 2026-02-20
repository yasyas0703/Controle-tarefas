import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';
import { registrarLog, getIp } from '@/app/utils/logAuditoria';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// GET /api/templates
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      include: {
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
      orderBy: { criado_em: 'desc' },
    });
    
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;
    
    const data = await request.json();
    
    const template = await prisma.template.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        fluxoDepartamentos: data.fluxoDepartamentos || [],
        questionariosPorDepartamento: data.questionariosPorDepartamento || {},
        criadoPorId: user.id,
      },
      include: {
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
      },
    });

    await registrarLog({
      usuarioId: user.id,
      acao: 'CRIAR',
      entidade: 'TEMPLATE',
      entidadeId: template.id,
      entidadeNome: template.nome,
      ip: getIp(request),
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar template:', error);
    return NextResponse.json(
      { error: 'Erro ao criar template' },
      { status: 500 }
    );
  }
}




