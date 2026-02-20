import { prisma } from '@/app/utils/prisma';

/**
 * Registra um log de auditoria global no banco de dados.
 * Chamado direto nos API routes (server-side) – não depende de fetch/HTTP.
 * Falha silenciosamente se a tabela ainda não existir.
 */
export async function registrarLog(opts: {
  usuarioId: number;
  acao: string;       // TipoAcaoLog: CRIAR, EDITAR, EXCLUIR, VISUALIZAR, AVANCAR, VOLTAR, FINALIZAR, PREENCHER, COMENTAR, ANEXAR, TAG, TRANSFERIR, INTERLIGAR, CHECK, LOGIN, LOGOUT, IMPORTAR
  entidade: string;   // ex: 'PROCESSO', 'EMPRESA', 'DEPARTAMENTO', 'USUARIO', 'TAG', 'TEMPLATE', 'COMENTARIO', 'DOCUMENTO', 'CALENDARIO', 'QUESTIONARIO'
  entidadeId?: number | null;
  entidadeNome?: string | null;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  detalhes?: string | null;
  processoId?: number | null;
  empresaId?: number | null;
  departamentoId?: number | null;
  ip?: string | null;
}) {
  try {
    await (prisma as any).logAuditoria.create({
      data: {
        usuarioId: opts.usuarioId,
        acao: opts.acao,
        entidade: opts.entidade,
        entidadeId: opts.entidadeId ?? null,
        entidadeNome: opts.entidadeNome ?? null,
        campo: opts.campo ?? null,
        valorAnterior: opts.valorAnterior != null ? String(opts.valorAnterior) : null,
        valorNovo: opts.valorNovo != null ? String(opts.valorNovo) : null,
        detalhes: opts.detalhes ?? null,
        processoId: opts.processoId ?? null,
        empresaId: opts.empresaId ?? null,
        departamentoId: opts.departamentoId ?? null,
        ip: opts.ip ?? null,
      },
    });
  } catch (e: any) {
    // Silencioso se tabela não existir ainda
    if (e?.code === 'P2021' || e?.message?.includes('does not exist')) return;
    console.error('[AuditLog] Falha ao registrar:', e?.message);
  }
}

/**
 * Helper: compara dois objetos e retorna os campos que mudaram.
 * Útil para registrar cada campo editado individualmente.
 */
export function detectarMudancas(
  antes: Record<string, any>,
  depois: Record<string, any>,
  camposParaIgnorar: string[] = ['atualizadoEm', 'atualizado_em', 'dataAtualizacao', 'updatedAt']
): { campo: string; valorAnterior: string; valorNovo: string }[] {
  const mudancas: { campo: string; valorAnterior: string; valorNovo: string }[] = [];
  const todosOsCampos = new Set([...Object.keys(antes), ...Object.keys(depois)]);

  for (const campo of todosOsCampos) {
    if (camposParaIgnorar.includes(campo)) continue;
    const a = antes[campo];
    const d = depois[campo];
    const aStr = a != null ? String(a) : '';
    const dStr = d != null ? String(d) : '';
    if (aStr !== dStr) {
      mudancas.push({ campo, valorAnterior: aStr, valorNovo: dStr });
    }
  }

  return mudancas;
}

/** Extrai IP do request */
export function getIp(request: { headers: { get(name: string): string | null } }): string | null {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
}
