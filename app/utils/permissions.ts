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
  // - Cadastrar empresas
  // - Criar departamentos
  // - Criar solicitações para outros departamentos
  // - Mover processos apenas do seu próprio departamento
  if (usuario.role === 'gerente') {
    // Não pode gerenciar usuários
    if (permissao === 'gerenciar_usuarios') {
      return false;
    }

    // Não pode cadastrar empresas
    if (permissao === 'criar_empresa' || permissao === 'cadastrar_empresa') {
      return false;
    }

    // Não pode criar departamentos
    if (permissao === 'criar_departamento' || permissao === 'editar_departamento' || permissao === 'excluir_departamento') {
      return false;
    }

    // Criar processo: apenas se o primeiro departamento do fluxo for o dele
    if (permissao === 'criar_processo') {
      if (contexto.fluxoDepartamentos && Array.isArray(contexto.fluxoDepartamentos) && contexto.fluxoDepartamentos.length > 0) {
        const primeiroDept = contexto.fluxoDepartamentos[0];
        return primeiroDept === usuario.departamento_id;
      }
      // Se não tem contexto, permite (mas deveria ter)
      return true;
    }

    // Mover processo: apenas se o processo estiver no departamento dele
    if (permissao === 'mover_processo') {
      const departamentoOrigemId = contexto.departamentoOrigemId || contexto.departamentoAtual;
      return departamentoOrigemId === usuario.departamento_id;
    }

    // Editar/excluir processo: apenas se estiver no departamento dele
    if (permissao === 'editar_processo' || permissao === 'excluir_processo') {
      const departamentoAtual = contexto.departamentoAtual;
      return departamentoAtual === usuario.departamento_id;
    }

    // Upload, comentários, questionários: apenas no departamento dele
    if (['upload_documento', 'adicionar_comentario', 'responder_questionario'].includes(permissao)) {
      const departamentoAtual = contexto.departamentoAtual;
      return departamentoAtual === usuario.departamento_id;
    }

    // Tags: pode criar, editar e excluir
    if (['criar_tag', 'editar_tag', 'excluir_tag'].includes(permissao)) {
      return true;
    }

    // Análises: pode ver
    if (permissao === 'ver_analises') {
      return true;
    }

    // Criar solicitação personalizada: apenas admin e gerente
    if (permissao === 'criar_processo_personalizado') {
      return true;
    }

    // Por padrão, permite outras ações
    return true;
  }

  // Usuário normal: acesso limitado
  if (usuario.role === 'usuario') {
    // Pode ver análises
    if (permissao === 'ver_analises') {
      return true;
    }

    // Pode criar solicitação (mas não personalizada - isso é controlado no Header)
    if (permissao === 'criar_processo') {
      // Usuário normal pode criar usando templates, mas não personalizada
      // Isso é controlado pela UI (botão Personalizada não aparece)
      return true;
    }

    // Pode preencher questionários no departamento dele
    if (permissao === 'responder_questionario') {
      const departamentoAtual = contexto.departamentoAtual;
      return departamentoAtual === usuario.departamento_id;
    }

    // NÃO pode mover processos
    if (permissao === 'mover_processo') {
      return false;
    }

    // NÃO pode gerenciar usuários, empresas, departamentos
    if (['gerenciar_usuarios', 'criar_empresa', 'cadastrar_empresa', 'criar_departamento', 'editar_departamento', 'excluir_departamento'].includes(permissao)) {
      return false;
    }

    // Não pode editar/excluir processos
    if (permissao === 'editar_processo' || permissao === 'excluir_processo') {
      return false;
    }

    // Não pode criar solicitações personalizadas (isso é controlado pela UI)
    if (permissao === 'criar_processo_personalizado') {
      return false;
    }

    // Por padrão, nega
    return false;
  }

  return false;
}

