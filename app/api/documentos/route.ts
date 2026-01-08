import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { uploadFile, deleteFile } from '@/app/utils/supabase';

export const dynamic = 'force-dynamic';

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
    
    return NextResponse.json(documentos);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar documentos' },
      { status: 500 }
    );
  }
}

// POST /api/documentos - Upload de documento
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
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
        uploadPorId: parseInt(userId),
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
        responsavelId: parseInt(userId),
        dataTimestamp: BigInt(Date.now()),
      },
    });
    
    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload' },
      { status: 500 }
    );
  }
}

