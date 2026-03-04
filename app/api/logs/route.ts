import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';
import { GHOST_USER_EMAIL } from '@/app/utils/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    if (roleUpper !== 'ADMIN' && roleUpper !== 'ADMIN_DEPARTAMENTO') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get('limite') || '500', 10);
    const acao = searchParams.get('acao');
    const entidade = searchParams.get('entidade');
    const usuarioId = searchParams.get('usuarioId');

    const where: any = {
      usuario: { email: { not: GHOST_USER_EMAIL }, isGhost: { not: true } },
    };
    if (acao) where.acao = acao;
    if (entidade) where.entidade = entidade;
    if (usuarioId) where.usuarioId = parseInt(usuarioId, 10);

    try {
      const logs = await (prisma as any).logAuditoria.findMany({
        where,
        include: {
          usuario: { select: { id: true, nome: true, email: true } },
        },
        orderBy: { criadoEm: 'desc' },
        take: Math.min(limite, 2000),
      });
      return NextResponse.json(logs);
    } catch (e: any) {
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
        return NextResponse.json([]);
      }
      throw e;
    }
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json({ error: 'Nao foi possivel carregar os logs de auditoria.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const data = await request.json();

    const ghostCheck = await prisma.usuario.findUnique({
      where: { id: user.id as number },
      select: { isGhost: true, email: true },
    });
    if (ghostCheck?.isGhost || ghostCheck?.email === GHOST_USER_EMAIL) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    try {
      const log = await (prisma as any).logAuditoria.create({
        data: {
          usuarioId: user.id,
          acao: data.acao,
          entidade: data.entidade,
          entidadeId: data.entidadeId || null,
          entidadeNome: data.entidadeNome || null,
          campo: data.campo || null,
          valorAnterior: data.valorAnterior != null ? String(data.valorAnterior) : null,
          valorNovo: data.valorNovo != null ? String(data.valorNovo) : null,
          detalhes: data.detalhes || null,
          processoId: data.processoId || null,
          empresaId: data.empresaId || null,
          departamentoId: data.departamentoId || null,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        },
      });
      return NextResponse.json(log, { status: 201 });
    } catch (e: any) {
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
        return NextResponse.json({ ok: true, pending: 'migration_needed' }, { status: 200 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    return NextResponse.json({ error: 'Nao foi possivel registrar o log de auditoria.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    if (roleUpper !== 'ADMIN' && roleUpper !== 'ADMIN_DEPARTAMENTO') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Os logs de auditoria sao permanentes e nao podem ser apagados.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Erro ao bloquear exclusao de logs:', error);
    return NextResponse.json({ error: 'Nao foi possivel proteger os logs de auditoria.' }, { status: 500 });
  }
}
