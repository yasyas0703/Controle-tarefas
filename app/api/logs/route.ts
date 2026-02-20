import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/logs - Obtém logs de auditoria global (apenas admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    if (roleUpper !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get('limite') || '500');
    const acao = searchParams.get('acao');
    const entidade = searchParams.get('entidade');
    const usuarioId = searchParams.get('usuarioId');

    const where: any = {};
    if (acao) where.acao = acao;
    if (entidade) where.entidade = entidade;
    if (usuarioId) where.usuarioId = parseInt(usuarioId);

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
      // Se a tabela não existir ainda (migration pendente), retorna vazio
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
        return NextResponse.json([]);
      }
      throw e;
    }
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 });
  }
}

/**
 * POST /api/logs - Registra um log de auditoria
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const data = await request.json();

    try {
      const log = await (prisma as any).logAuditoria.create({
        data: {
          usuarioId: user.id,
          acao: data.acao,
          entidade: data.entidade,
          entidadeId: data.entidadeId || null,
          entidadeNome: data.entidadeNome || null,
          campo: data.campo || null,
          valorAnterior: data.valorAnterior ? String(data.valorAnterior) : null,
          valorNovo: data.valorNovo ? String(data.valorNovo) : null,
          detalhes: data.detalhes || null,
          processoId: data.processoId || null,
          empresaId: data.empresaId || null,
          departamentoId: data.departamentoId || null,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        },
      });
      return NextResponse.json(log, { status: 201 });
    } catch (e: any) {
      // Se a tabela não existir ainda, silencioso
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
        return NextResponse.json({ ok: true, pending: 'migration_needed' }, { status: 200 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    return NextResponse.json({ error: 'Erro ao registrar log' }, { status: 500 });
  }
}

/**
 * DELETE /api/logs - Excluir logs de auditoria (admin only)
 * Body: { ids: number[] } para exclusão seletiva
 *    ou { todos: true } para limpar todos os logs
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    if (roleUpper !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await request.json();

    try {
      let deletados = 0;

      if (body.todos === true) {
        const result = await (prisma as any).logAuditoria.deleteMany({});
        deletados = result.count;
      } else if (Array.isArray(body.ids) && body.ids.length > 0) {
        const idsNumericos = body.ids.map(Number).filter((n: number) => !isNaN(n));
        if (idsNumericos.length === 0) {
          return NextResponse.json({ error: 'Nenhum ID válido fornecido' }, { status: 400 });
        }
        const result = await (prisma as any).logAuditoria.deleteMany({
          where: { id: { in: idsNumericos } },
        });
        deletados = result.count;
      } else {
        return NextResponse.json({ error: 'Forneça { ids: [...] } ou { todos: true }' }, { status: 400 });
      }

      return NextResponse.json({ success: true, deletados });
    } catch (e: any) {
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, deletados: 0 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Erro ao excluir logs:', error);
    return NextResponse.json({ error: 'Erro ao excluir logs' }, { status: 500 });
  }
}
