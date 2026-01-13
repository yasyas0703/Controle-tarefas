import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';
export const fetchCache = 'force-no-store';

// GET /api/usuarios/responsaveis
// - ADMIN: retorna usuários (pode filtrar por ?departamentoId=)
// - GERENTE: retorna usuários (sem restringir por departamento)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();

    const { searchParams } = new URL(request.url);
    const departamentoIdParam = searchParams.get('departamentoId');
    // ATENÇÃO: `searchParams.get(...)` retorna `null` quando ausente.
    // `Number(null) === 0`, então precisamos tratar explicitamente para não filtrar por departamentoId=0.
    const departamentoIdCandidate =
      typeof departamentoIdParam === 'string' && departamentoIdParam.trim() !== ''
        ? Number(departamentoIdParam)
        : undefined;
    const departamentoId =
      Number.isFinite(departamentoIdCandidate as any) && (departamentoIdCandidate as number) > 0
        ? (departamentoIdCandidate as number)
        : undefined;

    if (roleUpper !== 'ADMIN' && roleUpper !== 'GERENTE') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const baseWhere: any = { ativo: true };

    if (roleUpper === 'ADMIN') {
      if (typeof departamentoId === 'number') {
        baseWhere.departamentoId = departamentoId;
      }
    }

    const select = {
      id: true,
      nome: true,
      email: true,
      role: true,
      ativo: true,
      departamentoId: true,
    } as const;

    const usuarios = await prisma.usuario.findMany({
      where: baseWhere,
      select,
      orderBy: { nome: 'asc' },
    });

    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[responsaveis] retornando', usuarios.length, 'usuarios');
      } catch {
        // ignore
      }
    }

    const res = NextResponse.json(usuarios);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error('Erro ao buscar usuários responsáveis:', e);
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}
