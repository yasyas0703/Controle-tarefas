// API Client para comunicação com backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const toLower = (v: any) => (typeof v === 'string' ? v.toLowerCase() : v);
const toUpper = (v: any) => (typeof v === 'string' ? v.toUpperCase() : v);

const normalizeStatus = (status: any) => {
  const s = toLower(status);
  switch (s) {
    case 'em_andamento':
    case 'em andamento':
      return 'em_andamento';
    case 'finalizado':
      return 'finalizado';
    case 'pausado':
      return 'pausado';
    case 'cancelado':
      return 'cancelado';
    case 'rascunho':
      return 'rascunho';
    default:
      // Prisma enum vem como EM_ANDAMENTO etc
      if (typeof status === 'string') return status.toLowerCase();
      return 'em_andamento';
  }
};

const normalizePrioridade = (prioridade: any) => {
  const p = toLower(prioridade);
  switch (p) {
    case 'alta':
      return 'alta';
    case 'media':
      return 'media';
    case 'baixa':
      return 'baixa';
    default:
      if (typeof prioridade === 'string') return prioridade.toLowerCase();
      return 'media';
  }
};

const normalizeTipoCampo = (
  tipo: any
): 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'file' | 'phone' | 'email' => {
  const t = typeof tipo === 'string' ? tipo.toLowerCase() : '';
  switch (t) {
    case 'text':
    case 'text_simple':
    case 'texto':
    case 'textosimples':
    case 'textsimples':
    case 'textsimple':
      return 'text';
    case 'textarea':
    case 'text_area':
    case 'texto_longo':
    case 'textolongo':
      return 'textarea';
    case 'number':
    case 'numero':
      return 'number';
    case 'date':
    case 'data':
      return 'date';
    case 'boolean':
    case 'sim_nao':
    case 'sim/nao':
      return 'boolean';
    case 'select':
    case 'selecao':
      return 'select';
    case 'file':
    case 'arquivo':
      return 'file';
    case 'phone':
    case 'telefone':
      return 'phone';
    case 'email':
      return 'email';
    default: {
      // Prisma enum vem como TEXT, TEXTAREA etc
      const upper = typeof tipo === 'string' ? tipo.toUpperCase() : '';
      switch (upper) {
        case 'TEXT':
          return 'text';
        case 'TEXTAREA':
          return 'textarea';
        case 'NUMBER':
          return 'number';
        case 'DATE':
          return 'date';
        case 'BOOLEAN':
          return 'boolean';
        case 'SELECT':
          return 'select';
        case 'FILE':
          return 'file';
        case 'PHONE':
          return 'phone';
        case 'EMAIL':
          return 'email';
        default:
          return 'text';
      }
    }
  }
};

const normalizeTipoEvento = (tipo: any) => {
  const t = typeof tipo === 'string' ? tipo.toUpperCase() : '';
  switch (t) {
    case 'INICIO':
      return 'inicio';
    case 'ALTERACAO':
      return 'alteracao';
    case 'MOVIMENTACAO':
      return 'movimentacao';
    case 'CONCLUSAO':
      return 'conclusao';
    case 'FINALIZACAO':
      return 'finalizacao';
    case 'DOCUMENTO':
      return 'documento';
    case 'COMENTARIO':
      return 'comentario';
    default:
      return 'alteracao';
  }
};

const normalizeProcesso = (raw: any) => {
  const tagsArray = Array.isArray(raw?.tags) ? raw.tags : [];
  const tagsIds = tagsArray.length > 0 && typeof tagsArray[0] === 'object'
    ? tagsArray.map((t: any) => t.tagId ?? t.tag?.id).filter((x: any) => typeof x === 'number')
    : tagsArray;

  const tagsMetadata = tagsArray.length > 0 && typeof tagsArray[0] === 'object'
    ? tagsArray.map((t: any) => t.tag).filter(Boolean)
    : undefined;

  const comentariosArray = Array.isArray(raw?.comentarios) ? raw.comentarios : [];
  const comentarios = comentariosArray.map((c: any) => ({
    id: c.id,
    processoId: c.processoId,
    texto: c.texto,
    autor: c.autor?.nome ?? c.autor ?? '—',
    departamentoId: c.departamentoId ?? undefined,
    departamento: c.departamento?.nome ?? c.departamento ?? undefined,
    timestamp: c.criadoEm ?? c.timestamp ?? new Date().toISOString(),
    editado: Boolean(c.editado),
    editadoEm: c.editadoEm ?? undefined,
    mencoes: Array.isArray(c.mencoes) ? c.mencoes : [],
  }));

  const questionariosArray = Array.isArray(raw?.questionarios) ? raw.questionarios : [];

  const historicoEventosArray = Array.isArray(raw?.historicoEventos) ? raw.historicoEventos : [];
  const historico = historicoEventosArray
    .map((e: any) => {
      const data = e?.data ?? (e?.dataTimestamp ? new Date(Number(e.dataTimestamp)) : undefined);
      const responsavel =
        e?.responsavel?.nome ??
        (typeof e?.responsavel === 'string' ? e.responsavel : undefined) ??
        (typeof e?.responsavelId === 'number' ? `Usuário #${e.responsavelId}` : '—');

      return {
        departamento: e?.departamento ?? '—',
        data: data ?? new Date().toISOString(),
        dataTimestamp:
          e?.dataTimestamp !== undefined
            ? Number(e.dataTimestamp)
            : data
              ? new Date(data).getTime()
              : undefined,
        acao: String(e?.acao ?? ''),
        responsavel,
        tipo: normalizeTipoEvento(e?.tipo) as any,
      };
    })
    .filter((h: any) => h?.acao);

  const questionariosPorDepartamento: Record<number, any[]> = {};
  const respostasHistorico: Record<number, any> = {};

  const questionarios = questionariosArray
    .map((q: any) => {
      const departamentoId = Number(q?.departamentoId ?? q?.departamento?.id ?? 0);
      const normalized = {
        id: Number(q?.id),
        label: String(q?.label ?? ''),
        tipo: normalizeTipoCampo(q?.tipo),
        obrigatorio: Boolean(q?.obrigatorio),
        opcoes: Array.isArray(q?.opcoes) ? q.opcoes : [],
        ordem: Number(q?.ordem ?? 0),
        condicao:
          q?.condicaoPerguntaId
            ? {
                perguntaId: Number(q.condicaoPerguntaId),
                operador: (q.condicaoOperador || 'igual') as any,
                valor: String(q.condicaoValor ?? ''),
              }
            : undefined,
        // suporte interno para agrupamento
        departamentoId,
        respostas: Array.isArray(q?.respostas) ? q.respostas : [],
      };

      if (Number.isFinite(departamentoId) && departamentoId > 0) {
        questionariosPorDepartamento[departamentoId] = questionariosPorDepartamento[departamentoId] || [];
        questionariosPorDepartamento[departamentoId].push({
          id: normalized.id,
          label: normalized.label,
          tipo: normalized.tipo,
          obrigatorio: normalized.obrigatorio,
          opcoes: normalized.opcoes,
          ordem: normalized.ordem,
          condicao: normalized.condicao,
        });

        // Monta um "snapshot" de respostas por departamento para o modo somente leitura
        const respostas = normalized.respostas;
        if (Array.isArray(respostas) && respostas.length > 0) {
          const sorted = respostas
            .slice()
            .sort((a: any, b: any) => new Date(b.respondidoEm).getTime() - new Date(a.respondidoEm).getTime());
          const r = sorted[0];
          let valor: any = r?.resposta;
          if (typeof valor === 'string') {
            try {
              valor = JSON.parse(valor);
            } catch {
              // mantém string
            }
          }

          if (!respostasHistorico[departamentoId]) {
            respostasHistorico[departamentoId] = {
              departamentoId,
              departamentoNome: '',
              questionario: questionariosPorDepartamento[departamentoId] || [],
              respostas: {},
              respondidoEm: r?.respondidoEm,
              respondidoPor: r?.respondidoPor?.nome ?? undefined,
            };
          }

          respostasHistorico[departamentoId].respostas[String(normalized.id)] = valor;

          const tsPrev = respostasHistorico[departamentoId]?.respondidoEm
            ? new Date(respostasHistorico[departamentoId].respondidoEm).getTime()
            : 0;
          const tsNow = r?.respondidoEm ? new Date(r.respondidoEm).getTime() : 0;
          if (tsNow >= tsPrev) {
            respostasHistorico[departamentoId].respondidoEm = r?.respondidoEm;
            respostasHistorico[departamentoId].respondidoPor = r?.respondidoPor?.nome ?? undefined;
          }
        }
      }

      return {
        id: normalized.id,
        label: normalized.label,
        tipo: normalized.tipo,
        obrigatorio: normalized.obrigatorio,
        opcoes: normalized.opcoes,
        ordem: normalized.ordem,
        condicao: normalized.condicao,
        departamentoId,
      };
    })
    .filter((q: any) => Number.isFinite(q?.id));

  return {
    ...raw,
    nomeEmpresa: raw?.nomeEmpresa ?? raw?.empresa ?? 'Nova Empresa',
    status: normalizeStatus(raw?.status),
    prioridade: normalizePrioridade(raw?.prioridade),
    departamentoAtual: Number(raw?.departamentoAtual ?? 0),
    departamentoAtualIndex: Number(raw?.departamentoAtualIndex ?? 0),
    fluxoDepartamentos: Array.isArray(raw?.fluxoDepartamentos) ? raw.fluxoDepartamentos : [],
    tags: tagsIds,
    tagsMetadata,
    comentarios,
    questionarios,
    questionariosPorDepartamento,
    respostasHistorico,
    historico,
    historicoEvento: historico,
  };
};

async function parseError(response: Response) {
  try {
    const data = await response.json();
    if (data?.error) return String(data.error);
    if (data?.message) return String(data.message);

    // Algumas rotas retornam detalhes adicionais
    if (typeof data?.details === 'string' && data.details.trim()) return String(data.details).slice(0, 300);
    if (data?.details && typeof data.details === 'object') {
      try {
        return JSON.stringify(data.details).slice(0, 300);
      } catch {
        // ignore
      }
    }

    return 'Erro na requisição';
  } catch {
    return 'Erro na requisição';
  }
}

function toPrismaEnum(value: any) {
  if (typeof value !== 'string') return value;
  return value === value.toLowerCase() ? value.toUpperCase() : value;
}

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

  const response = await fetch(url, { ...options, headers, credentials: options.credentials ?? 'include' });
  
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

  // ========== CONSULTAS EXTERNAS (PROXY) ==========
  consultarCnpj: async (cnpj: string) => {
    try {
      const digits = String(cnpj || '').replace(/\D/g, '');
      const response = await fetchAutenticado(`${API_URL}/cnpj/${digits}`);
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      throw error;
    }
  },

  // ========== PROCESSOS ==========
  getProcessos: async () => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos`);
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      return Array.isArray(data) ? data.map(normalizeProcesso) : [];
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
      throw error;
    }
  },

  getProcesso: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/processos/${id}`);
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      return normalizeProcesso(data);
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
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      return normalizeProcesso(data);
    } catch (error) {
      console.error('Erro ao avançar processo:', error);
      throw error;
    }
  },

  salvarProcesso: async (processo: any) => {
    try {
      const payload = { ...processo };
      if (payload.status !== undefined) payload.status = toPrismaEnum(payload.status);
      if (payload.prioridade !== undefined) payload.prioridade = toPrismaEnum(payload.prioridade);

      const response = await fetchAutenticado(`${API_URL}/processos`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      return normalizeProcesso(data);
    } catch (error) {
      console.error('Erro ao salvar processo:', error);
      throw error;
    }
  },

  atualizarProcesso: async (id: number, processo: any) => {
    try {
      const payload = { ...processo };
      if (payload.status !== undefined) payload.status = toPrismaEnum(payload.status);
      if (payload.prioridade !== undefined) payload.prioridade = toPrismaEnum(payload.prioridade);

      const response = await fetchAutenticado(`${API_URL}/processos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      return normalizeProcesso(data);
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
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
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

      const response = await fetchAutenticado(`${API_URL}/documentos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw error;
    }
  },

  salvarQuestionariosProcesso: async (processoId: number, departamentoId: number, perguntas: any[]) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/questionarios`, {
        method: 'PUT',
        body: JSON.stringify({ processoId, departamentoId, perguntas }),
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar questionários do processo:', error);
      throw error;
    }
  },

  excluirDocumento: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/documentos/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
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
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.comentarios || [];
      return list.map((c: any) => ({
        id: c.id,
        processoId: c.processoId,
        texto: c.texto,
        autor: c.autor?.nome ?? c.autor ?? '—',
        departamentoId: c.departamentoId ?? undefined,
        departamento: c.departamento?.nome ?? c.departamento ?? undefined,
        timestamp: c.criadoEm ?? c.timestamp ?? new Date().toISOString(),
        editado: Boolean(c.editado),
        editadoEm: c.editadoEm ?? undefined,
        mencoes: Array.isArray(c.mencoes) ? c.mencoes : [],
      }));
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
      if (!response.ok) {
        throw new Error(await parseError(response));
      }
      const c = await response.json();
      return {
        id: c.id,
        processoId: c.processoId,
        texto: c.texto,
        autor: c.autor?.nome ?? c.autor ?? '—',
        departamentoId: c.departamentoId ?? undefined,
        departamento: c.departamento?.nome ?? c.departamento ?? undefined,
        timestamp: c.criadoEm ?? c.timestamp ?? new Date().toISOString(),
        editado: Boolean(c.editado),
        editadoEm: c.editadoEm ?? undefined,
        mencoes: Array.isArray(c.mencoes) ? c.mencoes : [],
      };
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
        const error = await response.json().catch(() => ({} as any));
        let msg = (error as any).error || 'Erro ao criar usuário';
        const details = (error as any).details;
        if (details && typeof details === 'object') {
          const nome = typeof details.nome === 'string' ? details.nome : '';
          const email = typeof details.email === 'string' ? details.email : '';
          const id = typeof details.usuarioId === 'number' ? details.usuarioId : null;
          if (nome || email || typeof id === 'number') {
            msg = `${msg}${email ? `: ${email}` : ''}${nome ? ` (usuário: ${nome})` : ''}${typeof id === 'number' ? ` [id ${id}]` : ''}`;
          }
        }
        throw new Error(msg);
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
        const error = await response.json().catch(() => ({} as any));
        let msg = (error as any).error || 'Erro ao atualizar usuário';
        const details = (error as any).details;
        if (details && typeof details === 'object') {
          const nome = typeof details.nome === 'string' ? details.nome : '';
          const email = typeof details.email === 'string' ? details.email : '';
          const uid = typeof details.usuarioId === 'number' ? details.usuarioId : null;
          if (nome || email || typeof uid === 'number') {
            msg = `${msg}${email ? `: ${email}` : ''}${nome ? ` (usuário: ${nome})` : ''}${typeof uid === 'number' ? ` [id ${uid}]` : ''}`;
          }
        }
        throw new Error(msg);
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

  excluirNotificacao: async (id: number) => {
    try {
      const response = await fetchAutenticado(`${API_URL}/notificacoes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any)?.error || 'Erro ao excluir notificação');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      throw error;
    }
  },

  // ========== USUÁRIOS (seleção de responsável) ==========
  getUsuariosResponsaveis: async (departamentoId?: number) => {
    try {
      const qs = Number.isFinite(departamentoId as any) ? `?departamentoId=${departamentoId}` : '';
      const response = await fetchAutenticado(`${API_URL}/usuarios/responsaveis${qs}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any)?.error || 'Erro ao buscar usuários');
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar usuários responsáveis:', error);
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
