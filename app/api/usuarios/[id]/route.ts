import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { hashPassword } from '@/app/utils/auth';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// GET /api/usuarios/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(params.id) },
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
    });
    
    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

// PUT /api/usuarios/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    // Apenas ADMIN pode atualizar usuários
    if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    
    const data = await request.json();

    // GERENTE não pode promover/alterar ADMIN
    const targetId = parseInt(params.id);
    const target = await prisma.usuario.findUnique({ where: { id: targetId }, select: { id: true, role: true, ativo: true } });
    if (!target) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const requesterIsAdmin = requireRole(user, ['ADMIN']);

    // Impede o usuário de se desativar (evita lock-out)
    if (targetId === (user as any).id && data.ativo === false) {
      return NextResponse.json(
        { error: 'Você não pode desativar seu próprio usuário.' },
        { status: 400 }
      );
    }

    // Impede desativar o último ADMIN ativo
    if (data.ativo === false && String(target.role).toUpperCase() === 'ADMIN' && target.ativo) {
      const outrosAdminsAtivos = await prisma.usuario.count({
        where: {
          role: 'ADMIN',
          ativo: true,
          id: { not: targetId },
        },
      });

      if (outrosAdminsAtivos === 0) {
        return NextResponse.json(
          { error: 'Não é possível desativar o último administrador ativo.' },
          { status: 400 }
        );
      }
    }
    
    const nextRoleUpper = data.role ? String(data.role).toUpperCase() : undefined;
    const roleFinalUpper = nextRoleUpper ?? String(target.role).toUpperCase();

    const departamentoIdRaw = data?.departamentoId;
    const departamentoId = Number.isFinite(Number(departamentoIdRaw)) ? Number(departamentoIdRaw) : undefined;

    // Se está definindo/alterando para USUARIO/GERENTE, exige departamento
    if ((roleFinalUpper === 'USUARIO' || roleFinalUpper === 'GERENTE') && typeof departamentoId !== 'number') {
      return NextResponse.json({ error: 'Departamento é obrigatório para usuário/gerente' }, { status: 400 });
    }

    if (typeof departamentoId === 'number') {
      const dept = await prisma.departamento.findUnique({ where: { id: departamentoId }, select: { id: true, ativo: true } });
      if (!dept || !dept.ativo) {
        return NextResponse.json({ error: 'Departamento inválido' }, { status: 400 });
      }
    }

    const updateData: any = {
      nome: data.nome,
      email: data.email,
      role: nextRoleUpper,
      departamentoId: typeof departamentoId === 'number' ? departamentoId : null,
      permissoes: data.permissoes || [],
      ativo: data.ativo !== undefined ? data.ativo : true,
    };

    // requester é admin (já validado acima)
    
    // Se tiver senha, atualiza
    if (data.senha) {
      updateData.senha = await hashPassword(data.senha);
    }
    
    const usuario = await prisma.usuario.update({
      where: { id: parseInt(params.id) },
      data: updateData,
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
    
    return NextResponse.json(usuario);
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}

// DELETE /api/usuarios/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    // Apenas ADMIN pode excluir usuários
    if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const target = await prisma.usuario.findUnique({ where: { id: parseInt(params.id) }, select: { id: true, role: true } });
    if (!target) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    await prisma.usuario.delete({
      where: { id: parseInt(params.id) },
    });
    
    return NextResponse.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir usuário' },
      { status: 500 }
    );
  }
}




