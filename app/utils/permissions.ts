import { Usuario } from '@/app/types';

/**
 * Verifica se um usuário tem permissão para executar uma ação
 */
export function temPermissao(
  usuario: Usuario | null,
  permissao: string,
  contexto: any = {}
): boolean {
  if (!usuario) {
    return false;
  }

  // Admin tem acesso total
  if (usuario.role === 'admin') {
    return true;
  }

  // Gerente: tem acesso a quase tudo, exceto:
  // - Gerenciar usuários
  if (usuario.role === 'gerente') {
    // Gerente NÃO pode gerenciar usuários
    if (['gerenciar_usuarios', 'criar_usuario', 'editar_usuario', 'excluir_usuario'].includes(permissao)) {
      return false;
    }

    // Gerente NÃO pode editar/excluir processos (só mover/finalizar)
    if (permissao === 'editar_processo' || permissao === 'excluir_processo') {
      return false;
    }

    // Tags: pode gerenciar (CRUD) e aplicar
    if (['gerenciar_tags', 'criar_tag', 'editar_tag', 'excluir_tag', 'aplicar_tags'].includes(permissao)) return true;

    // Análises: pode ver
    if (permissao === 'ver_analises') {
      return true;
    }

    // Criar solicitação (inclusive personalizada)
    if (permissao === 'criar_processo' || permissao === 'criar_processo_personalizado') return true;

    // Mover/avançar processo: gerente só atua no próprio departamento
    if (permissao === 'mover_processo') {
      const departamentoAtual = contexto?.departamentoAtual;
      if (typeof departamentoAtual === 'number' && typeof usuario.departamento_id === 'number') {
        return departamentoAtual === usuario.departamento_id;
      }
      return true;
    }

    // Finalizar: somente no próprio departamento e (se informado) apenas no último
    if (permissao === 'finalizar_processo') {
      const departamentoAtual = contexto?.departamentoAtual;
      const isUltimoDepartamento = contexto?.isUltimoDepartamento;
      if (typeof departamentoAtual === 'number' && typeof usuario.departamento_id === 'number') {
        if (departamentoAtual !== usuario.departamento_id) return false;
      }
      if (isUltimoDepartamento !== undefined) return Boolean(isUltimoDepartamento);
      return true;
    }

    // Empresa: gerente edita, mas não cadastra/cria
    if (permissao === 'editar_empresa') return true;
    if (permissao === 'cadastrar_empresa' || permissao === 'criar_empresa') return false;

    // Comentários e visualização
    if (permissao === 'comentar' || permissao === 'ver_questionario') return true;

    // Por padrão, permite outras ações
    return true;
  }

  // Usuário normal: acesso limitado
  if (usuario.role === 'usuario') {
    // Pode ver análises
    if (permissao === 'ver_analises') {
      return true;
    }

    // Pode criar solicitação (via templates), mas não personalizada
    if (permissao === 'criar_processo') return true;
    if (permissao === 'criar_processo_personalizado') return false;

    // Pode comentar e aplicar tags
    if (permissao === 'comentar' || permissao === 'aplicar_tags') return true;

    // Pode ver questionários
    if (permissao === 'ver_questionario') return true;

    // Pode preencher questionários no departamento dele
    if (permissao === 'responder_questionario') {
      const departamentoAtual = contexto.departamentoAtual;
      return departamentoAtual === usuario.departamento_id;
    }

    // NÃO pode mover/finalizar processos
    if (permissao === 'mover_processo' || permissao === 'finalizar_processo') return false;

    // NÃO pode gerenciar usuários, empresas, departamentos, nem gerenciar tags
    if (
      [
        'gerenciar_usuarios',
        'criar_usuario',
        'editar_usuario',
        'excluir_usuario',
        'criar_empresa',
        'cadastrar_empresa',
        'editar_empresa',
        'criar_departamento',
        'editar_departamento',
        'excluir_departamento',
        'gerenciar_tags',
        'criar_tag',
        'editar_tag',
        'excluir_tag',
      ].includes(permissao)
    ) {
      return false;
    }

    // Não pode editar/excluir processos
    if (permissao === 'editar_processo' || permissao === 'excluir_processo') return false;

    // Por padrão, nega
    return false;
  }

  return false;
}

