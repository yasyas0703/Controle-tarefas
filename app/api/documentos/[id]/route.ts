import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { deleteFile, generateSignedUrl } from '@/app/utils/supabase';
import { requireAuth, requireRole } from '@/app/utils/routeAuth';
import { verificarPermissaoDocumento } from '@/app/utils/verificarPermissaoDocumento';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// Dias para expiração na lixeira
const DIAS_EXPIRACAO_LIXEIRA = 15;

// DELETE /api/documentos/:id - Move para lixeira ao invés de excluir permanentemente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;
    const idRaw = params.id;
    const docId = Number(idRaw);
    if (!Number.isFinite(docId) || Number.isNaN(docId)) {
      console.warn('DELETE /api/documentos/:id recebido com id inválido', idRaw);
      return NextResponse.json({ error: 'id inválido' }, { status: 400 });
    }

    // Buscar documento
    const documento = await prisma.documento.findUnique({
      where: { id: docId },
      include: {
        departamento: { select: { id: true, nome: true } },
      },
    });

    if (!documento) {
      console.warn(`Documento não encontrado ao excluir, id=${docId}`);
      return NextResponse.json(
        { error: 'Documento não encontrado', id: docId },
        { status: 404 }
      );
    }
    
    // Verificar permissão para excluir usando utilitário centralizado
    const userId = Number(user.id);
    const userRole = String((user as any).role || '').toUpperCase();

    const podeVer = verificarPermissaoDocumento(
      {
        visibility: (documento as any).visibility,
        allowedRoles: (documento as any).allowedRoles,
        allowedUserIds: (documento as any).allowedUserIds,
        uploadPorId: documento.uploadPorId,
      },
      { id: userId, role: userRole }
    );

    if (!podeVer) {
      return NextResponse.json(
        { error: 'Sem permissão para excluir este documento' },
        { status: 403 }
      );
    }
    
    // Calcular data de expiração (15 dias)
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + DIAS_EXPIRACAO_LIXEIRA);

    // Mover para lixeira ao invés de excluir
    try {
      const dadosOriginais = JSON.parse(JSON.stringify({
        id: documento.id,
        processoId: documento.processoId,
        nome: documento.nome,
        tipo: documento.tipo,
        tipoCategoria: (documento as any).tipoCategoria,
        tamanho: documento.tamanho.toString(),
        url: documento.url,
        path: documento.path,
        departamentoId: documento.departamentoId,
        perguntaId: documento.perguntaId,
        dataUpload: documento.dataUpload,
        uploadPorId: documento.uploadPorId,
        visibility: (documento as any).visibility,
        allowedRoles: (documento as any).allowedRoles,
        allowedUserIds: (documento as any).allowedUserIds,
      }));

      const docVis = String((documento as any).visibility || 'PUBLIC').toUpperCase();
      const docAllowedRoles: string[] = Array.isArray((documento as any).allowedRoles) ? (documento as any).allowedRoles.map((r: any) => String(r)) : [];
      const docAllowedUserIds: number[] = Array.isArray((documento as any).allowedUserIds) ? (documento as any).allowedUserIds.map((n: any) => Number(n)) : [];

      await prisma.itemLixeira.create({
        data: {
          tipoItem: 'DOCUMENTO',
          itemIdOriginal: documento.id,
          dadosOriginais,
          processoId: documento.processoId,
          departamentoId: documento.departamentoId,
          visibility: docVis,
          allowedRoles: docAllowedRoles.map(r => r.toLowerCase()),
          allowedUserIds: docAllowedUserIds,
          deletadoPorId: userId,
          expiraEm: dataExpiracao,
          nomeItem: documento.nome,
          descricaoItem: `Documento ${documento.tipo} do processo #${documento.processoId}`,
        },
      });
    } catch (e) {
      console.error('Erro ao criar ItemLixeira for documento:', e);
    }
    
    // Agora sim, excluir do banco (mas NÃO do storage - para permitir restauração)
    await prisma.documento.delete({
      where: { id: parseInt(params.id) },
    });
    
    // Criar evento no histórico
    await prisma.historicoEvento.create({
      data: {
        processoId: documento.processoId,
        tipo: 'DOCUMENTO',
        acao: `Documento "${documento.nome}" movido para lixeira`,
        responsavelId: user.id,
        dataTimestamp: BigInt(Date.now()),
      },
    });
    
    return NextResponse.json({ 
      message: 'Documento movido para lixeira',
      diasParaExpiracao: DIAS_EXPIRACAO_LIXEIRA,
    });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir documento' },
      { status: 500 }
    );
  }
}

// GET /api/documentos/:id -> retorna URL temporária (signed) se permitido
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const docId = Number(params.id);
    if (!Number.isFinite(docId)) return NextResponse.json({ error: 'id inválido' }, { status: 400 });

    const documento = await prisma.documento.findUnique({ where: { id: docId } });
    if (!documento) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });

    // Verificar permissão de visualização usando utilitário centralizado
    const userId = Number((user as any).id);
    const userRole = String((user as any).role || '').toUpperCase();

    const podeVer = verificarPermissaoDocumento(
      {
        visibility: (documento as any).visibility,
        allowedRoles: (documento as any).allowedRoles,
        allowedUserIds: (documento as any).allowedUserIds,
        uploadPorId: documento.uploadPorId,
      },
      { id: userId, role: userRole }
    );

    if (!podeVer) return NextResponse.json({ error: 'Sem permissão para visualizar este documento' }, { status: 403 });

    // Sempre gerar signed URL temporária (300s) — nunca expor URL pública
    if (!documento.path) {
      console.error('Documento não possui path armazenado, não é possível gerar signed URL', { id: documento.id });
      return NextResponse.json({ error: 'Documento sem arquivo disponível' }, { status: 400 });
    }

    const signedUrl = await generateSignedUrl(documento.path, 300);
    if (!signedUrl) {
      return NextResponse.json({ error: 'Erro ao gerar URL temporária' }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Erro no GET /api/documentos/:id', error);
    return NextResponse.json({ error: 'Erro ao buscar documento' }, { status: 500 });
  }
}




