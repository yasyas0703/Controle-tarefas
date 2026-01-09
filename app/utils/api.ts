// API Client para comunicação com backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const getToken = () => {
  if (typeof window === 'undefined') return null;
  // Primeiro tenta pegar do cookie (o backend seta httpOnly)
  // Se não tiver, tenta do localStorage como fallback
  return localStorage.getItem('token');
};

export const fetchAutenticado = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: HeadersInit = {
    ...options.headers,
  };

  // Se não for FormData, adiciona Content-Type
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  
  // Se não autorizado, limpa token e redireciona
  if (response.status === 401) {
    localStorage.removeItem('token');
    // Não fazemos redirect automático, deixa o componente lidar
  }

  return response;
};

export const api = {
  // ========== LOGIN ==========
  login: async (email: string, senha: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
        credentials: 'include', // Importante para receber cookies
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer login');
      }
      
      const data = await response.json();
      
      // Salva token no localStorage também (fallback)
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  },

  // ========== PROCESSOS ==========
  getProcessos: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos`);
      if (!response.ok) {
        throw new Error('Erro ao carregar processos');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
      throw error;
    }
  },

  getProcesso: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos/${id}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar processo');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar processo:', error);
      throw error;
    }
  },

  avancarProcesso: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos/${id}/avancar`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Erro ao avançar processo');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao avançar processo:', error);
      throw error;
    }
  },

  salvarProcesso: async (processo: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos`, {
        method: 'POST',
        body: JSON.stringify(processo)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar processo:', error);
      throw error;
    }
  },

  atualizarProcesso: async (id: number, processo: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(processo)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar processo:', error);
      throw error;
    }
  },

  excluirProcesso: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Erro ao excluir processo');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir processo:', error);
      throw error;
    }
  },

  adicionarTagProcesso: async (processoId: number, tagId: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos/${processoId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tagId }),
      });
      if (!response.ok) {
        throw new Error('Erro ao adicionar tag');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
      throw error;
    }
  },

  removerTagProcesso: async (processoId: number, tagId: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos/${processoId}/tags/${tagId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erro ao remover tag');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao remover tag:', error);
      throw error;
    }
  },

  // ========== DEPARTAMENTOS ==========
  getDepartamentos: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/departamentos`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
      throw error;
    }
  },

  salvarDepartamento: async (departamento: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/departamentos`, {
        method: 'POST',
        body: JSON.stringify(departamento)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar departamento:', error);
      throw error;
    }
  },

  atualizarDepartamento: async (id: number, departamento: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/departamentos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(departamento)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar departamento:', error);
      throw error;
    }
  },

  excluirDepartamento: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/departamentos/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir departamento:', error);
      throw error;
    }
  },

  // ========== DOCUMENTOS ==========
  getDocumentos: async (processoId: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/documentos?processoId=${processoId}`);
      const data = await response.json();
      return Array.isArray(data) ? data : data.documentos || [];
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      throw error;
    }
  },

  uploadDocumento: async (processoId: number, arquivo: File, tipo: string, perguntaId?: number, departamentoId?: number) => {
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('tipo', tipo);
      formData.append('processoId', String(processoId));
      if (perguntaId) formData.append('perguntaId', String(perguntaId));
      if (departamentoId) formData.append('departamentoId', String(departamentoId));

      const token = getToken();
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/documentos`, {
        method: 'POST',
        headers,
        body: formData
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  },

  excluirDocumento: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/documentos/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      throw error;
    }
  },

  // ========== QUESTIONÁRIOS ==========
  getQuestionarios: async (departamentoId: number, processoId?: number) => {
    try {
      const url = processoId 
        ? `${API_URL}/questionarios?departamentoId=${departamentoId}&processoId=${processoId}`
        : `${API_URL}/questionarios?departamentoId=${departamentoId}`;
      const response = await fetchAutenticado(url);
      if (!response.ok) {
        throw new Error('Erro ao carregar questionários');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar questionários:', error);
      throw error;
    }
  },

  getRespostasQuestionario: async (processoId: number, departamentoId: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/questionarios/respostas/${processoId}/${departamentoId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar respostas');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
      throw error;
    }
  },

  salvarRespostasQuestionario: async (processoId: number, departamentoId: number, respostas: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/questionarios/salvar-respostas`, {
        method: 'POST',
        body: JSON.stringify({ processoId, departamentoId, respostas })
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      throw error;
    }
  },

  // ========== COMENTÁRIOS ==========
  getComentarios: async (processoId: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/comentarios?processoId=${processoId}`);
      const data = await response.json();
      return Array.isArray(data) ? data : data.comentarios || [];
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      throw error;
    }
  },

  salvarComentario: async (dados: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/comentarios`, {
        method: 'POST',
        body: JSON.stringify(dados)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar comentário:', error);
      throw error;
    }
  },

  atualizarComentario: async (id: number, texto: string) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/comentarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ texto })
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
      throw error;
    }
  },

  excluirComentario: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/comentarios/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      throw error;
    }
  },

  // ========== TAGS ==========
  getTags: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/tags`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
      throw error;
    }
  },

  salvarTag: async (tag: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/tags`, {
        method: 'POST',
        body: JSON.stringify(tag)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar tag:', error);
      throw error;
    }
  },

  atualizarTag: async (id: number, tag: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(tag)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar tag:', error);
      throw error;
    }
  },

  excluirTag: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/tags/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
      throw error;
    }
  },

  // ========== EMPRESAS ==========
  getEmpresas: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/empresas`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      throw error;
    }
  },

  salvarEmpresa: async (empresa: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/empresas`, {
        method: 'POST',
        body: JSON.stringify(empresa)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      throw error;
    }
  },

  atualizarEmpresa: async (id: number, empresa: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/empresas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(empresa)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      throw error;
    }
  },

  excluirEmpresa: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/empresas/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      throw error;
    }
  },

  // ========== TEMPLATES ==========
  getTemplates: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/templates`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      throw error;
    }
  },

  salvarTemplate: async (template: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/templates`, {
        method: 'POST',
        body: JSON.stringify(template)
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      throw error;
    }
  },

  excluirTemplate: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/templates/${id}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      throw error;
    }
  },

  // ========== USUÁRIOS ==========
  getUsuarios: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/usuarios`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      throw error;
    }
  },

  getMe: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/usuarios/me`);
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do usuário');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      throw error;
    }
  },

  salvarUsuario: async (usuario: any) => {
    try {
      // O middleware já adiciona x-user-role automaticamente baseado no token
      // Mas garantimos que está sendo enviado
      const response = await fetchAutenticado(`${API_URL}/usuarios`, {
        method: 'POST',
        body: JSON.stringify(usuario),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar usuário');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  atualizarUsuario: async (id: number, usuario: any) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(usuario),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar usuário');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  excluirUsuario: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir usuário');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  },

  // ========== NOTIFICAÇÕES ==========
  getNotificacoes: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/notificacoes`);
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      throw error;
    }
  },

  marcarNotificacaoLida: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/notificacoes/${id}/marcar-lida`, {
        method: 'PATCH'
      });
      if (!response.ok) {
        throw new Error('Erro ao marcar notificação como lida');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  },

  // ========== ANALYTICS ==========
  getAnalytics: async (periodo?: number) => {
    try {
      const url = periodo 
        ? `${API_URL}/analytics?periodo=${periodo}`
        : `${API_URL}/analytics`;
      const response = await fetchAutenticado(url);
      if (!response.ok) {
        throw new Error('Erro ao carregar analytics');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      throw error;
    }
  },
};
