import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { deleteFile } from '@/app/utils/supabase';

export const dynamic = 'force-dynamic';

// DELETE /api/documentos/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    // Buscar documento
    const documento = await prisma.documento.findUnique({
      where: { id: parseInt(params.id) },
    });
    
    if (!documento) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar permissão (autor do upload ou admin)
    if (documento.uploadPorId !== parseInt(userId) && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Sem permissão para excluir este documento' },
        { status: 403 }
      );
    }
    
    // Excluir do Supabase Storage
    if (documento.path) {
      try {
        await deleteFile(documento.path);
      } catch (error) {
        console.error('Erro ao excluir arquivo do storage:', error);
        // Continua mesmo se falhar no storage
      }
    }
    
    // Excluir do banco
    await prisma.documento.delete({
      where: { id: parseInt(params.id) },
    });
    
    // Criar evento no histórico
    await prisma.historicoEvento.create({
      data: {
        processoId: documento.processoId,
        tipo: 'DOCUMENTO',
        acao: `Documento "${documento.nome}" excluído`,
        responsavelId: parseInt(userId),
        dataTimestamp: BigInt(Date.now()),
      },
    });
    
    return NextResponse.json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir documento' },
      { status: 500 }
    );
  }
}

