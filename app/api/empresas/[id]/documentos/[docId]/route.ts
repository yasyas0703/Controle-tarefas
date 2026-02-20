import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { deleteFile } from '@/app/utils/supabase';
import { requireAuth } from '@/app/utils/routeAuth';
import { registrarLog, getIp } from '@/app/utils/logAuditoria';
import { verificarPermissaoDocumento } from '@/app/utils/verificarPermissaoDocumento';

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

    // Verificar permissão antes de permitir exclusão
    const userId = Number(user.id);
    const userRole = String((user as any).role || '').toUpperCase();
    const podeVer = verificarPermissaoDocumento(
      {
        visibility: (documento as any).visibility,
        allowedRoles: (documento as any).allowedRoles,
        allowedUserIds: (documento as any).allowedUserIds,
        uploadPorId: (documento as any).uploadPorId,
      },
      { id: userId, role: userRole }
    );

    if (!podeVer) {
      return NextResponse.json({ error: 'Sem permissão para excluir este documento' }, { status: 403 });
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
          visibility: String((documento as any).visibility || 'PUBLIC').toUpperCase(),
          allowedRoles: Array.isArray((documento as any).allowedRoles) ? (documento as any).allowedRoles : [],
          allowedUserIds: Array.isArray((documento as any).allowedUserIds) ? (documento as any).allowedUserIds : [],
          deletadoPorId: userId,
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

    // Log de auditoria para exclusão de documento
    await registrarLog({
      usuarioId: user.id as number,
      acao: 'EXCLUIR',
      entidade: 'DOCUMENTO',
      entidadeId: documento.id,
      entidadeNome: documento.nome,
      empresaId,
      ip: getIp(request),
    });

    return NextResponse.json({ message: 'Documento movido para lixeira' });
  } catch (e) {
    console.error('Erro ao excluir documento da empresa:', e);
    return NextResponse.json({ error: 'Erro ao excluir documento' }, { status: 500 });
  }
}
