'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Departamento, Processo, Tag, Usuario, Notificacao, Empresa, Template } from '@/app/types';
import type { TipoAlerta } from '@/app/components/modals/ModalAlerta';
import { api } from '@/app/utils/api';

type ShowListarEmpresasState =
  | null
  | 'cadastradas'
  | 'nao-cadastradas'
  | { tipo: 'cadastradas' | 'nao-cadastradas'; empresaId?: number };

interface SistemaContextType {
  // Estados
  processos: Processo[];
  empresas: Empresa[];
  templates: Template[];
  departamentos: Departamento[];
  tags: Tag[];
  usuarios: Usuario[];
  notificacoes: Notificacao[];
  usuarioLogado: Usuario | null;

  // Modals
  showNovaEmpresa: boolean;
  showQuestionario: any;
  showVisualizacao: any;
  showComentarios: number | null;
  showAnalytics: boolean;
  showUploadDocumento: any;
  showGaleria: any;
  showGerenciarTags: boolean;
  showSelecionarTags: any;
  showConfirmacao: any;
  showAlerta: any;
  showPreviewDocumento: any;
  showGerenciarUsuarios: boolean;
  showCadastrarEmpresa: boolean;
  showListarEmpresas: ShowListarEmpresasState;
  showCriarDepartamento: boolean;
  showQuestionarioSolicitacao: any;
  showSelecionarTemplate: boolean;

  // Funções
  setProcessos: React.Dispatch<React.SetStateAction<Processo[]>>;
  setEmpresas: React.Dispatch<React.SetStateAction<Empresa[]>>;
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
  setDepartamentos: React.Dispatch<React.SetStateAction<Departamento[]>>;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
  setNotificacoes: React.Dispatch<React.SetStateAction<Notificacao[]>>;
  setUsuarioLogado: React.Dispatch<React.SetStateAction<Usuario | null>>;

  setShowNovaEmpresa: (show: boolean) => void;
  setShowQuestionario: (show: any) => void;
  setShowVisualizacao: (show: any) => void;
  setShowComentarios: (show: number | null) => void;
  setShowAnalytics: (show: boolean) => void;
  setShowUploadDocumento: (show: any) => void;
  setShowGaleria: (show: any) => void;
  setShowGerenciarTags: (show: boolean) => void;
  setShowSelecionarTags: (show: any) => void;
  setShowConfirmacao: (show: any) => void;
  setShowAlerta: (show: any) => void;
  setShowPreviewDocumento: (show: any) => void;
  setShowGerenciarUsuarios: (show: boolean) => void;
  setShowCadastrarEmpresa: (show: boolean) => void;
  setShowListarEmpresas: (show: ShowListarEmpresasState) => void;
  setShowCriarDepartamento: (show: boolean) => void;
  setShowQuestionarioSolicitacao: (show: any) => void;
  setShowSelecionarTemplate: (show: boolean) => void;

  adicionarNotificacao: (mensagem: string, tipo: 'sucesso' | 'erro' | 'info') => void;
  removerNotificacao: (id: number) => void;
  mostrarAlerta: (titulo: string, mensagem: string, tipo?: TipoAlerta) => Promise<void>;
  mostrarConfirmacao: (config: {
    titulo: string;
    mensagem: string;
    tipo?: 'info' | 'aviso' | 'perigo' | 'sucesso';
    textoConfirmar?: string;
    textoCancelar?: string;
  }) => Promise<boolean>;
  criarEmpresa: (dados: Partial<Empresa>) => Promise<Empresa>;
  atualizarEmpresa: (empresaId: number, dados: Partial<Empresa>) => Promise<void>;
  excluirEmpresa: (empresaId: number) => Promise<void>;
  criarTemplate: (dados: {
    nome: string;
    descricao?: string;
    fluxoDepartamentos: number[];
    questionariosPorDepartamento: any;
  }) => Promise<Template>;
  excluirTemplate: (templateId: number) => Promise<void>;
  criarProcesso: (dados: Partial<Processo>) => Promise<Processo>;
  atualizarProcesso: (processoId: number, dados: Partial<Processo>) => Promise<void>;
  excluirProcesso: (processoId: number) => Promise<void>;
  avancarParaProximoDepartamento: (processoId: number) => Promise<void>;
  finalizarProcesso: (processoId: number) => Promise<void>;
  aplicarTagsProcesso: (processoId: number, tags: number[]) => Promise<void>;
  adicionarComentarioProcesso: (processoId: number, texto: string, mencoes?: string[]) => Promise<void>;
  adicionarDocumentoProcesso: (processoId: number, arquivo: File, tipo: string, departamentoId?: number, perguntaId?: number) => Promise<any>;
}

const SistemaContext = createContext<SistemaContextType | undefined>(undefined);

export function SistemaProvider({ children }: { children: React.ReactNode }) {
  // Estados principais
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [templates, setTemplates] = useState<Template[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const raw = window.localStorage.getItem('templates');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [tags, setTags] = useState<Tag[]>([
    { id: 1, nome: 'Urgente', cor: 'bg-red-500', texto: 'text-white' },
    { id: 2, nome: 'Aguardando Cliente', cor: 'bg-yellow-500', texto: 'text-white' },
    { id: 3, nome: 'Revisão', cor: 'bg-purple-500', texto: 'text-white' },
    { id: 4, nome: 'Documentação Pendente', cor: 'bg-orange-500', texto: 'text-white' },
  ]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);

  // Estados de Modals
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false);
  const [showQuestionario, setShowQuestionario] = useState<any>(null);
  const [showVisualizacao, setShowVisualizacao] = useState<any>(null);
  const [showComentarios, setShowComentarios] = useState<number | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showUploadDocumento, setShowUploadDocumento] = useState<any>(null);
  const [showGaleria, setShowGaleria] = useState<any>(null);
  const [showGerenciarTags, setShowGerenciarTags] = useState(false);
  const [showSelecionarTags, setShowSelecionarTags] = useState<any>(null);
  const [showConfirmacao, setShowConfirmacao] = useState<any>(null);
  const [showAlerta, setShowAlerta] = useState<any>(null);
  const [showPreviewDocumento, setShowPreviewDocumento] = useState<any>(null);
  const [showGerenciarUsuarios, setShowGerenciarUsuarios] = useState(false);
  const [showCadastrarEmpresa, setShowCadastrarEmpresa] = useState(false);
  const [showListarEmpresas, setShowListarEmpresas] = useState<ShowListarEmpresasState>(null);
  const [showCriarDepartamento, setShowCriarDepartamento] = useState(false);
  const [showQuestionarioSolicitacao, setShowQuestionarioSolicitacao] = useState<any>(null);
  const [showSelecionarTemplate, setShowSelecionarTemplate] = useState(false);

  const mostrarAlerta = useCallback(
    (titulo: string, mensagem: string, tipo: TipoAlerta = 'info') => {
      return new Promise<void>((resolve) => {
        setShowAlerta(null);
        setTimeout(() => {
          setShowAlerta({
            titulo,
            mensagem,
            tipo,
            onClose: () => {
              setShowAlerta(null);
              resolve();
            },
          });
        }, 10);
      });
    },
    []
  );

  const mostrarConfirmacao = useCallback(
    (config: {
      titulo: string;
      mensagem: string;
      tipo?: 'info' | 'aviso' | 'perigo' | 'sucesso';
      textoConfirmar?: string;
      textoCancelar?: string;
    }) => {
      return new Promise<boolean>((resolve) => {
        setShowConfirmacao(null);
        setTimeout(() => {
          setShowConfirmacao({
            ...config,
            onConfirm: () => {
              setShowConfirmacao(null);
              resolve(true);
            },
            onCancel: () => {
              setShowConfirmacao(null);
              resolve(false);
            },
          });
        }, 10);
      });
    },
    []
  );

  // Funções de notificação
  const adicionarNotificacao = useCallback((mensagem: string, tipo: 'sucesso' | 'erro' | 'info') => {
    const novaNotificacao: Notificacao = {
      id: Date.now(),
      mensagem,
      tipo,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      lida: false,
    };
    setNotificacoes(prev => [novaNotificacao, ...prev]);
  }, []);

  const removerNotificacao = useCallback((id: number) => {
    setNotificacoes(prev => prev.filter(n => n.id !== id));
  }, []);

  // Carregar dados do back-end quando usuário estiver logado
  useEffect(() => {
    if (!usuarioLogado) return;

    async function carregarDados() {
      try {
        // Carregar departamentos
        const departamentosData = await api.getDepartamentos();
        setDepartamentos(departamentosData || []);

        // Carregar tags
        const tagsData = await api.getTags();
        setTags(tagsData || []);

        // Carregar processos
        const processosData = await api.getProcessos();
        setProcessos(processosData || []);

        // Carregar empresas (todas, sem filtro)
        const empresasData = await api.getEmpresas();
        console.log('📊 Empresas carregadas:', empresasData?.length || 0, empresasData);
        setEmpresas(empresasData || []);

        // Carregar templates
        const templatesData = await api.getTemplates();
        setTemplates(templatesData || []);

        // Carregar usuários (se admin)
        if (usuarioLogado.role === 'admin') {
          const usuariosData = await api.getUsuarios();
          setUsuarios(usuariosData || []);
        }

        // Carregar notificações
        try {
          const notificacoesData = await api.getNotificacoes();
          setNotificacoes(Array.isArray(notificacoesData) ? notificacoesData : []);
        } catch (error) {
          console.error('Erro ao carregar notificações:', error);
          setNotificacoes([]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    }

    carregarDados();
  }, [usuarioLogado]);

  useEffect(() => {
    try {
      window.localStorage.setItem('templates', JSON.stringify(templates));
    } catch {
      // noop
    }
  }, [templates]);

  const criarEmpresa = useCallback(async (dados: Partial<Empresa>) => {
    try {
      const nova = await api.salvarEmpresa(dados);
      setEmpresas(prev => [...prev, nova]);
      adicionarNotificacao('Empresa criada com sucesso', 'sucesso');
      return nova;
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao criar empresa', 'erro');
      throw error;
    }
  }, []);

  const atualizarEmpresa = useCallback(async (empresaId: number, dados: Partial<Empresa>) => {
    try {
      const atualizada = await api.atualizarEmpresa(empresaId, dados);
      setEmpresas(prev => prev.map(e => e.id === empresaId ? atualizada : e));
      adicionarNotificacao('Empresa atualizada com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao atualizar empresa', 'erro');
      throw error;
    }
  }, []);

  const excluirEmpresa = useCallback(async (empresaId: number) => {
    try {
      await api.excluirEmpresa(empresaId);
      setEmpresas(prev => prev.filter(e => e.id !== empresaId));
      adicionarNotificacao('Empresa excluída com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao excluir empresa', 'erro');
      throw error;
    }
  }, []);

  const criarTemplate = useCallback(
    async (dados: {
      nome: string;
      descricao?: string;
      fluxoDepartamentos: number[];
      questionariosPorDepartamento: any;
    }) => {
      try {
        const novo = await api.salvarTemplate({
          nome: dados.nome,
          descricao: dados.descricao,
          fluxoDepartamentos: dados.fluxoDepartamentos,
          questionariosPorDepartamento: dados.questionariosPorDepartamento,
        });
        setTemplates(prev => [...prev, novo]);
        adicionarNotificacao('Template criado com sucesso', 'sucesso');
        return novo;
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao criar template', 'erro');
        throw error;
      }
    },
    []
  );

  const excluirTemplate = useCallback(async (templateId: number) => {
    try {
      await api.excluirTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      adicionarNotificacao('Template excluído com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao excluir template', 'erro');
      throw error;
    }
  }, []);

  const atualizarProcesso = useCallback(async (processoId: number, dados: Partial<Processo>) => {
    try {
      const atualizado = await api.atualizarProcesso(processoId, dados);
      setProcessos(prev => prev.map(p => p.id === processoId ? atualizado : p));
      adicionarNotificacao('Processo atualizado com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao atualizar processo', 'erro');
      throw error;
    }
  }, []);

  const criarProcesso = useCallback(
    async (dados: Partial<Processo>) => {
      try {
        const fluxo =
          (dados.fluxoDepartamentos && dados.fluxoDepartamentos.length > 0
            ? dados.fluxoDepartamentos
            : departamentos.length > 0
              ? [departamentos[0].id]
              : [1]) as number[];

        const departamentoInicial =
          (dados.departamentoAtual ?? fluxo[0] ?? departamentos[0]?.id ?? 1) as number;

        const novo = await api.salvarProcesso({
          nome: dados.nome,
          nomeServico: dados.nomeServico,
          nomeEmpresa: dados.nomeEmpresa || dados.empresa || 'Nova Empresa',
          cliente: dados.cliente,
          email: dados.email,
          telefone: dados.telefone,
          empresaId: dados.empresaId,
          status: dados.status || 'EM_ANDAMENTO',
          prioridade: dados.prioridade?.toUpperCase() || 'MEDIA',
          departamentoAtual: departamentoInicial,
          departamentoAtualIndex: 0,
          fluxoDepartamentos: fluxo,
          descricao: dados.descricao,
          notasCriador: dados.notasCriador,
        });

        // Recarregar processos para garantir que apareça no departamento
        try {
          const processosData = await api.getProcessos();
          setProcessos(processosData || []);
        } catch (err) {
          // Se falhar ao recarregar, adiciona o novo processo manualmente
          setProcessos(prev => [...prev, novo]);
        }
        
        adicionarNotificacao('Processo criado com sucesso', 'sucesso');
        return novo;
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao criar processo', 'erro');
        throw error;
      }
    },
    [departamentos]
  );

  const excluirProcesso = useCallback(async (processoId: number) => {
    try {
      await api.excluirProcesso(processoId);
      setProcessos(prev => prev.filter(p => p.id !== processoId));
      adicionarNotificacao('Processo excluído com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao excluir processo', 'erro');
      throw error;
    }
  }, []);

  const avancarParaProximoDepartamento = useCallback(
    async (processoId: number) => {
      try {
        const atualizado = await api.avancarProcesso(processoId);
        setProcessos(prev => prev.map(p => p.id === processoId ? atualizado : p));
        adicionarNotificacao('Processo avançado para próximo departamento', 'sucesso');
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao avançar processo', 'erro');
        throw error;
      }
    },
    []
  );

  const finalizarProcesso = useCallback(async (processoId: number) => {
    try {
      await api.atualizarProcesso(processoId, {
        status: 'FINALIZADO' as any,
        dataFinalizacao: new Date(),
        progresso: 100,
      });
      
      // Recarrega o processo atualizado
      const processoAtualizado = await api.getProcesso(processoId);
      setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
      
      adicionarNotificacao('Processo finalizado com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao finalizar processo', 'erro');
      throw error;
    }
  }, []);

  const aplicarTagsProcesso = useCallback(async (processoId: number, novasTags: number[]) => {
    try {
      // Importar fetchAutenticado dinamicamente
      const { fetchAutenticado } = await import('@/app/utils/api');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      
      const response = await fetchAutenticado(`${API_URL}/processos/${processoId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: novasTags }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao aplicar tags');
      }
      
      // Recarrega o processo atualizado
      const processo = await api.getProcesso(processoId);
      setProcessos(prev => prev.map(p => p.id === processoId ? processo : p));
      
      adicionarNotificacao('Tags aplicadas com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao aplicar tags', 'erro');
      throw error;
    }
  }, []);

  const adicionarComentarioProcesso = useCallback(
    async (processoId: number, texto: string, mencoes?: string[]) => {
      if (!texto.trim()) return;

      try {
        const processo = processos.find(p => p.id === processoId);
        const novoComentario = await api.salvarComentario({
          processoId,
          texto,
          mencoes: mencoes || [],
          departamentoId: processo?.departamentoAtual,
        });

        // Recarrega o processo atualizado
        const processoAtualizado = await api.getProcesso(processoId);
        setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
        
        adicionarNotificacao('Comentário adicionado com sucesso', 'sucesso');
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao adicionar comentário', 'erro');
        throw error;
      }
    },
    [processos]
  );

  const adicionarDocumentoProcesso = useCallback(async (processoId: number, arquivo: File, tipo: string, departamentoId?: number, perguntaId?: number) => {
    try {
      const processo = processos.find(p => p.id === processoId);
      const novoDocumento = await api.uploadDocumento(
        processoId,
        arquivo,
        tipo,
        perguntaId,
        departamentoId || processo?.departamentoAtual
      );

      // Recarrega o processo atualizado
      const processoAtualizado = await api.getProcesso(processoId);
      setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
      
      adicionarNotificacao('Documento adicionado com sucesso', 'sucesso');
      return novoDocumento;
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao adicionar documento', 'erro');
      throw error;
    }
  }, [processos]);

  const value: SistemaContextType = {
    processos,
    empresas,
    templates,
    departamentos,
    tags,
    usuarios,
    notificacoes,
    usuarioLogado,

    showNovaEmpresa,
    showQuestionario,
    showVisualizacao,
    showComentarios,
    showAnalytics,
    showUploadDocumento,
    showGaleria,
    showGerenciarTags,
    showSelecionarTags,
    showConfirmacao,
    showAlerta,
    showPreviewDocumento,
    showGerenciarUsuarios,
    showCadastrarEmpresa,
    showListarEmpresas,
    showCriarDepartamento,
    showQuestionarioSolicitacao,
    showSelecionarTemplate,

    setProcessos,
    setEmpresas,
    setTemplates,
    setDepartamentos,
    setTags,
    setUsuarios,
    setNotificacoes,
    setUsuarioLogado,

    setShowNovaEmpresa,
    setShowQuestionario,
    setShowVisualizacao,
    setShowComentarios,
    setShowAnalytics,
    setShowUploadDocumento,
    setShowGaleria,
    setShowGerenciarTags,
    setShowSelecionarTags,
    setShowConfirmacao,
    setShowAlerta,
    setShowPreviewDocumento,
    setShowGerenciarUsuarios,
    setShowCadastrarEmpresa,
    setShowListarEmpresas,
    setShowCriarDepartamento,
    setShowQuestionarioSolicitacao,
    setShowSelecionarTemplate,

    adicionarNotificacao,
    removerNotificacao,
    mostrarAlerta,
    mostrarConfirmacao,
    criarEmpresa,
    atualizarEmpresa,
    excluirEmpresa,
    criarTemplate,
    excluirTemplate,
    criarProcesso,
    atualizarProcesso,
    excluirProcesso,
    avancarParaProximoDepartamento,
    finalizarProcesso,
    aplicarTagsProcesso,
    adicionarComentarioProcesso,
    adicionarDocumentoProcesso,
  };

  return (
    <SistemaContext.Provider value={value}>
      {children}
    </SistemaContext.Provider>
  );
}

export { SistemaContext };

export function useSistema() {
  const context = useContext(SistemaContext);
  if (!context) {
    throw new Error('useSistema deve ser usado dentro de SistemaProvider');
  }
  return context;
}
