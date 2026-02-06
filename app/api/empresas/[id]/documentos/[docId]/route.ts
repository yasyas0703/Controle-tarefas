import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { deleteFile } from '@/app/utils/supabase';
import { requireAuth } from '@/app/utils/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// DELETE /api/empresas/:id/documentos/:docId
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const empresaId = Number(params.id);
    const docId = Number(params.docId);

    if (!Number.isFinite(empresaId) || !Number.isFinite(docId)) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    const documento = await prisma.empresaDocumento.findFirst({
      where: { id: docId, empresaId },
    });

    if (!documento) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    // Excluir do storage
    if ((documento as any).path) {
      try {
        await deleteFile((documento as any).path);
      } catch (e) {
        console.error('Erro ao excluir arquivo do storage:', e);
      }
    }

    // Salvar na lixeira antes de excluir
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 15);

    try {
      const dadosOriginais = JSON.parse(JSON.stringify(documento));
      await prisma.itemLixeira.create({
        data: {
          tipoItem: 'EMPRESA_DOCUMENTO',
          itemIdOriginal: documento.id,
          dadosOriginais,
          empresaId: empresaId,
          departamentoId: null,
          visibility: 'PUBLIC',
          allowedRoles: [],
          allowedUserIds: [],
          deletadoPorId: user.id as number,
          expiraEm: dataExpiracao,
          nomeItem: documento.nome,
          descricaoItem: documento.tipo || null,
        }
      });
    } catch (e) {
      console.error('Erro ao criar ItemLixeira for empresaDocumento:', e);
    }

    // Excluir do banco
    await prisma.empresaDocumento.delete({ where: { id: docId } });

    return NextResponse.json({ message: 'Documento movido para lixeira' });
  } catch (e) {
    console.error('Erro ao excluir documento da empresa:', e);
    return NextResponse.json({ error: 'Erro ao excluir documento' }, { status: 500 });
  }
}
