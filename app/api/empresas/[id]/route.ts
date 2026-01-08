import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

export const dynamic = 'force-dynamic';

// GET /api/empresas/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        processos: {
          orderBy: { dataCriacao: 'desc' },
          take: 10,
        },
        _count: {
          select: { processos: true },
        },
      },
    });
    
    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(empresa);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar empresa' },
      { status: 500 }
    );
  }
}

// PUT /api/empresas/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const empresa = await prisma.empresa.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(data.cnpj !== undefined && { cnpj: data.cnpj }),
        ...(data.codigo !== undefined && { codigo: data.codigo }),
        ...(data.razao_social !== undefined && { razao_social: data.razao_social }),
        ...(data.apelido !== undefined && { apelido: data.apelido }),
        ...(data.inscricao_estadual !== undefined && { inscricao_estadual: data.inscricao_estadual }),
        ...(data.inscricao_municipal !== undefined && { inscricao_municipal: data.inscricao_municipal }),
        ...(data.regime_federal !== undefined && { regime_federal: data.regime_federal }),
        ...(data.regime_estadual !== undefined && { regime_estadual: data.regime_estadual }),
        ...(data.regime_municipal !== undefined && { regime_municipal: data.regime_municipal }),
        ...(data.data_abertura !== undefined && { data_abertura: data.data_abertura ? new Date(data.data_abertura) : null }),
        ...(data.estado !== undefined && { estado: data.estado }),
        ...(data.cidade !== undefined && { cidade: data.cidade }),
        ...(data.bairro !== undefined && { bairro: data.bairro }),
        ...(data.logradouro !== undefined && { logradouro: data.logradouro }),
        ...(data.numero !== undefined && { numero: data.numero }),
        ...(data.cep !== undefined && { cep: data.cep }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.telefone !== undefined && { telefone: data.telefone }),
        ...(data.cnpj !== undefined && { cadastrada: !!data.cnpj && data.cnpj.replace(/\D/g, '').length >= 14 }),
      },
    });
    
    return NextResponse.json(empresa);
  } catch (error: any) {
    console.error('Erro ao atualizar empresa:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'CNPJ ou código já cadastrado' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar empresa' },
      { status: 500 }
    );
  }
}

// DELETE /api/empresas/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.empresa.delete({
      where: { id: parseInt(params.id) },
    });
    
    return NextResponse.json({ message: 'Empresa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir empresa' },
      { status: 500 }
    );
  }
}

