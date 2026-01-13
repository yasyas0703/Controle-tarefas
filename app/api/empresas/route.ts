import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// GET /api/empresas
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const { searchParams } = new URL(request.url);
    const cadastrada = searchParams.get('cadastrada');
    const busca = searchParams.get('busca');
    
    const where: any = {};
    
    // Filtrar por cadastrada apenas se o parâmetro foi informado
    if (cadastrada !== null && cadastrada !== undefined && cadastrada !== '') {
      where.cadastrada = cadastrada === 'true';
    }
    
    // Filtrar por busca se informado
    if (busca) {
      where.OR = [
        { codigo: { contains: busca, mode: 'insensitive' } },
        { razao_social: { contains: busca, mode: 'insensitive' } },
        { cnpj: { contains: busca } },
      ];
    }
    
    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { criado_em: 'desc' },
      include: {
        _count: {
          select: { processos: true },
        },
      },
    });
    
    return NextResponse.json(empresas);
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar empresas' },
      { status: 500 }
    );
  }
}

// POST /api/empresas
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    if (!requireRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: 'Sem permissão para cadastrar empresa' }, { status: 403 });
    }

    const data = await request.json();
    
    // Determinar se é empresa cadastrada: precisa ter CNPJ válido (14 dígitos) ou CPF válido (11 dígitos)
    // Mas no contexto do sistema, empresas cadastradas devem ter CNPJ (14 dígitos)
    const cnpjLimpo = data.cnpj ? String(data.cnpj).replace(/\D/g, '') : '';
    const temCnpjValido = cnpjLimpo.length === 14; // CNPJ tem 14 dígitos
    
    // Regra do sistema: se tem CNPJ válido (14 dígitos), é empresa cadastrada.
    // Isso evita inconsistência quando o frontend envia `cadastrada` incorretamente.
    const empresaCadastrada = temCnpjValido ? true : Boolean(data.cadastrada);
    
    const empresa = await prisma.empresa.create({
      data: {
        cnpj: data.cnpj || null,
        codigo: data.codigo,
        razao_social: data.razao_social,
        apelido: data.apelido,
        inscricao_estadual: data.inscricao_estadual,
        inscricao_municipal: data.inscricao_municipal,
        regime_federal: data.regime_federal,
        regime_estadual: data.regime_estadual,
        regime_municipal: data.regime_municipal,
        data_abertura: data.data_abertura ? new Date(data.data_abertura) : null,
        estado: data.estado,
        cidade: data.cidade,
        bairro: data.bairro,
        logradouro: data.logradouro,
        numero: data.numero,
        cep: data.cep,
        email: data.email,
        telefone: data.telefone,
        cadastrada: empresaCadastrada,
      },
    });
    
    return NextResponse.json(empresa, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar empresa:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'CNPJ ou código já cadastrado' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao criar empresa' },
      { status: 500 }
    );
  }
}

