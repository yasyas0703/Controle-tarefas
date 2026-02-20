import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { hashPassword } from '@/app/utils/auth';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';
import { Role } from '@prisma/client';
import { registrarLog, getIp } from '@/app/utils/logAuditoria';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// GET /api/usuarios
export async function GET(request: NextRequest) {
  try {
    console.time('GET /api/usuarios');
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        departamento: {
          select: { id: true, nome: true },
        },
        criadoEm: true,
      },
      orderBy: { nome: 'asc' },
    });
    console.timeEnd('GET /api/usuarios');
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}

// POST /api/usuarios
export async function POST(request: NextRequest) {
  try {
    console.time('POST /api/usuarios');
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    // Apenas ADMIN pode criar usuários
    if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    
    const data = await request.json();

    const requestedRoleRaw = String(data.role || 'USUARIO').toUpperCase();
    const role: Role = (Object.values(Role) as string[]).includes(requestedRoleRaw)
      ? (requestedRoleRaw as Role)
      : Role.USUARIO;

    const departamentoIdRaw = data?.departamentoId;
    const departamentoId = Number.isFinite(Number(departamentoIdRaw)) ? Number(departamentoIdRaw) : undefined;

    // Usuário/gerente sempre precisam de departamento
    if ((role === Role.USUARIO || role === Role.GERENTE) && typeof departamentoId !== 'number') {
      return NextResponse.json({ error: 'Departamento é obrigatório para usuário/gerente' }, { status: 400 });
    }

    let dept;
    if (typeof departamentoId === 'number') {
      dept = await prisma.departamento.findUnique({ where: { id: departamentoId }, select: { id: true, ativo: true } });
      if (!dept || !dept.ativo) {
        console.timeEnd('POST /api/usuarios');
        return NextResponse.json({ error: 'Departamento inválido' }, { status: 400 });
      }
    }
    
    const nome = String(data.nome || '').trim();
    const email = String(data.email || '').trim();
    const senha = String(data.senha || '').trim();

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    if (!senha) {
      return NextResponse.json(
        { error: 'Senha é obrigatória' },
        { status: 400 }
      );
    }

    // Se já existir usuário com este email:
    // - se estiver inativo, reativa e atualiza dados
    // - se estiver ativo, retorna 409 com detalhes
    const existente = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nome: true, email: true, ativo: true },
    });
    if (existente) {
      if (!existente.ativo) {
        const senhaHash = await hashPassword(senha);
        const usuarioReativado = await prisma.usuario.update({
          where: { id: existente.id },
          data: {
            nome,
            senha: senhaHash,
            role,
            departamentoId: typeof departamentoId === 'number' ? departamentoId : null,
            permissoes: data.permissoes || [],
            ativo: true,
          },
          select: {
            id: true,
            nome: true,
            email: true,
            role: true,
            ativo: true,
            departamento: {
              select: { id: true, nome: true },
            },
          },
        });
        // Audit log: usuário reativado
        await registrarLog({
          usuarioId: user.id as number,
          acao: 'CRIAR',
          entidade: 'USUARIO',
          entidadeId: usuarioReativado.id,
          entidadeNome: usuarioReativado.nome,
          detalhes: 'Usuário reativado (já existia inativo)',
          ip: getIp(request),
        });

        console.timeEnd('POST /api/usuarios');
        return NextResponse.json({ ...usuarioReativado, reativado: true });
      }

      console.timeEnd('POST /api/usuarios');
      return NextResponse.json(
        {
          error: 'Email já cadastrado',
          details: {
            usuarioId: existente.id,
            nome: existente.nome,
            email: existente.email,
            ativo: existente.ativo,
          },
        },
        { status: 409 }
      );
    }
    
    const senhaHash = await hashPassword(senha);
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        role,
        departamentoId: typeof departamentoId === 'number' ? departamentoId : null,
        permissoes: data.permissoes || [],
        ativo: data.ativo !== undefined ? data.ativo : true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        departamento: {
          select: { id: true, nome: true },
        },
      },
    });
    // Audit log: novo usuário criado
    await registrarLog({
      usuarioId: user.id as number,
      acao: 'CRIAR',
      entidade: 'USUARIO',
      entidadeId: usuario.id,
      entidadeNome: usuario.nome,
      ip: getIp(request),
    });

    console.timeEnd('POST /api/usuarios');
    return NextResponse.json(usuario, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}




