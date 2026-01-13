import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { uploadFile, deleteFile } from '@/app/utils/supabase';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

function jsonBigInt(data: unknown, init?: { status?: number }) {
  return new NextResponse(
    JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ),
    {
      status: init?.status ?? 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    }
  );
}

// GET /api/documentos?processoId=123
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const processoId = searchParams.get('processoId');
    const departamentoId = searchParams.get('departamentoId');
    
    if (!processoId) {
      return NextResponse.json(
        { error: 'processoId é obrigatório' },
        { status: 400 }
      );
    }
    
    const documentos = await prisma.documento.findMany({
      where: {
        processoId: parseInt(processoId),
        ...(departamentoId && { departamentoId: parseInt(departamentoId) }),
      },
      include: {
        departamento: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { dataUpload: 'desc' },
    });

    return jsonBigInt(documentos);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return jsonBigInt({ error: 'Erro ao buscar documentos' }, { status: 500 });
  }
}

// POST /api/documentos - Upload de documento
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;
    
    const formData = await request.formData();
    const file = formData.get('arquivo') as File;
    const processoId = parseInt(formData.get('processoId') as string);
    const tipo = formData.get('tipo') as string;
    const departamentoId = formData.get('departamentoId')
      ? parseInt(formData.get('departamentoId') as string)
      : null;
    const perguntaId = formData.get('perguntaId')
      ? parseInt(formData.get('perguntaId') as string)
      : null;
    
    if (!file || !processoId || !tipo) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Upload para Supabase Storage
    const { url, path } = await uploadFile(file, `processos/${processoId}`);
    
    // Salvar no banco
    const documento = await prisma.documento.create({
      data: {
        processoId,
        nome: file.name,
        tipo,
        tipoCategoria: (formData.get('tipoCategoria') as string) || null,
        tamanho: BigInt(file.size),
        url,
        path,
        departamentoId,
        perguntaId,
        uploadPorId: user.id,
      },
      include: {
        departamento: {
          select: { id: true, nome: true },
        },
      },
    });
    
    // Criar evento no histórico
    await prisma.historicoEvento.create({
      data: {
        processoId,
        tipo: 'DOCUMENTO',
        acao: `Documento "${file.name}" adicionado`,
        responsavelId: user.id,
        dataTimestamp: BigInt(Date.now()),
      },
    });
    
    return jsonBigInt(documento, { status: 201 });
  } catch (error) {
    console.error('Erro no upload:', error);
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload';
    return jsonBigInt({ error: message }, { status: 500 });
  }
}




