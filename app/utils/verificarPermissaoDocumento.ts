/**
 * Utilitário centralizado para verificação de permissão de documentos.
 * Usado por todas as rotas que lidam com documentos (processos e empresas).
 */

interface DocumentoPermissao {
  visibility?: string | null;
  allowedRoles?: string[] | null;
  allowedUserIds?: number[] | null;
  uploadPorId?: number | null;
}

interface UsuarioPermissao {
  id: number;
  role: string;
}

/**
 * Verifica se um usuário tem permissão para visualizar/acessar um documento.
 *
 * Regras (em ordem de prioridade):
 * 1. O autor do upload (uploadPorId) SEMPRE tem acesso
 * 2. ADMIN sempre tem acesso
 * 3. PUBLIC = qualquer usuário autenticado
 * 4. ROLES = somente usuários com role listada em allowedRoles
 * 5. USERS = somente usuários listados em allowedUserIds
 * 6. NONE / outros = somente uploader e admin (já cobertos acima)
 */
export function verificarPermissaoDocumento(
  documento: DocumentoPermissao,
  usuario: UsuarioPermissao
): boolean {
  try {
    const userId = Number(usuario.id);
    const userRole = String(usuario.role || '').toUpperCase();

    // 1. Uploader sempre pode ver
    if (documento.uploadPorId != null && documento.uploadPorId === userId) {
      return true;
    }

    // 2. Admin sempre pode ver
    if (userRole === 'ADMIN') {
      return true;
    }

    const vis = String(documento.visibility || 'PUBLIC').toUpperCase();

    // 3. Público = todos autenticados
    if (vis === 'PUBLIC') {
      return true;
    }

    const allowedRoles: string[] = Array.isArray(documento.allowedRoles)
      ? documento.allowedRoles.map((r) => String(r).toUpperCase())
      : [];
    const allowedUserIds: number[] = Array.isArray(documento.allowedUserIds)
      ? documento.allowedUserIds.map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : [];

    // 4. Por roles
    if (vis === 'ROLES') {
      return allowedRoles.length > 0 && allowedRoles.includes(userRole);
    }

    // 5. Por usuários específicos
    if (vis === 'USERS') {
      return allowedUserIds.length > 0 && allowedUserIds.includes(userId);
    }

    // 6. NONE ou qualquer outro valor = somente uploader/admin (já tratados)
    return false;
  } catch {
    return false;
  }
}
