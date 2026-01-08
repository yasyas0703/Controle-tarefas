import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

// GET /api/empresas
export async function GET(request: NextRequest) {
  try {
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
    const data = await request.json();
    
    const empresa = await prisma.empresa.create({
      data: {
        cnpj: data.cnpj,
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
        cadastrada: !!data.cnpj && data.cnpj.replace(/\D/g, '').length >= 14,
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

