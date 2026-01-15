'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Departamento, Processo, Tag, Usuario, Notificacao, Empresa, Template } from '@/app/types';
import type { TipoAlerta } from '@/app/components/modals/ModalAlerta';
import { api } from '@/app/utils/api';
import { getSupabaseBrowserClient } from '@/app/utils/supabaseBrowser';
import LoadingOverlay from '@/app/components/LoadingOverlay';

type RealtimeGroupStatus = 'disabled' | 'connecting' | 'connected' | 'fallback';

type RealtimeInfo = {
  enabled: boolean;
  processos: RealtimeGroupStatus;
  core: RealtimeGroupStatus;
  notificacoes: RealtimeGroupStatus;
};

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
  realtimeInfo: RealtimeInfo;

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
  marcarNotificacaoComoLida: (id: number) => Promise<void>;
  marcarTodasNotificacoesComoLidas: () => Promise<void>;
  notificacoesNavegadorAtivas: boolean;
  ativarNotificacoesNavegador: () => Promise<boolean>;
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
  globalLoading: boolean;
  setGlobalLoading: (v: boolean) => void;
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
  const notificacoesRef = useRef<Notificacao[]>([]);
  const realtimeProcessosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processosPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processosRealtimeStatusRef = useRef<'idle' | 'subscribed' | 'error'>('idle');

  const realtimeCoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const corePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coreRealtimeStatusRef = useRef<'idle' | 'subscribed' | 'error'>('idle');
  const realtimeNotificacoesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificacoesPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificacoesRealtimeStatusRef = useRef<'idle' | 'subscribed' | 'error'>('idle');
  const [realtimeInfo, setRealtimeInfo] = useState<RealtimeInfo>({
    enabled: false,
    processos: 'disabled',
    core: 'disabled',
    notificacoes: 'disabled',
  });
  const [globalLoading, setGlobalLoading] = useState(false);
  const [notificacoesNavegadorAtivas, setNotificacoesNavegadorAtivas] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      return window.localStorage.getItem('notificacoesNavegadorAtivas') === 'true';
    } catch {
      return false;
    }
  });

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
      origem: 'local',
    };
    setNotificacoes(prev => [novaNotificacao, ...prev]);
  }, []);

  const ativarNotificacoesNavegador = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      adicionarNotificacao('Seu navegador não suporta notificações', 'erro');
      return false;
    }

    if (Notification.permission === 'granted') {
      try {
        window.localStorage.setItem('notificacoesNavegadorAtivas', 'true');
      } catch {
        // noop
      }
      setNotificacoesNavegadorAtivas(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      adicionarNotificacao('Notificações bloqueadas no navegador. Libere nas permissões do site.', 'erro');
      return false;
    }

    const perm = await Notification.requestPermission();
    const ok = perm === 'granted';
    try {
      window.localStorage.setItem('notificacoesNavegadorAtivas', ok ? 'true' : 'false');
    } catch {
      // noop
    }
    setNotificacoesNavegadorAtivas(ok);
    if (!ok) {
      adicionarNotificacao('Permissão de notificação não concedida', 'info');
    }
    return ok;
  }, [adicionarNotificacao]);

  useEffect(() => {
    notificacoesRef.current = notificacoes;
  }, [notificacoes]);

  const removerNotificacao = useCallback((id: number) => {
    const notif = notificacoes.find(n => n.id === id);

    // Se for local, só remove do estado
    if (!notif || notif.origem === 'local') {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
      return;
    }

    // Se for do banco, apaga no backend e só então remove do estado.
    // (Se falhar, mantemos no UI e avisamos.)
    api
      .excluirNotificacao(id)
      .then(() => {
        setNotificacoes(prev => prev.filter(n => n.id !== id));
      })
      .catch((error: any) => {
        console.error('Erro ao excluir notificação:', error);
        adicionarNotificacao(error?.message || 'Erro ao excluir notificação', 'erro');
      });
  }, [notificacoes, adicionarNotificacao]);

  function normalizarNotificacoesDoBackend(dados: any): Notificacao[] {
    const arr = Array.isArray(dados) ? dados : [];
    return arr
      .map((n: any) => {
        const tipoRaw = String(n.tipo || 'INFO').toUpperCase();
        const tipoMap: Record<string, Notificacao['tipo']> = {
          SUCESSO: 'sucesso',
          ERRO: 'erro',
          INFO: 'info',
          AVISO: 'aviso',
        };
        const tipo = tipoMap[tipoRaw] ?? 'info';

        const criadoEm = n.criadoEm ?? n.timestamp;
        const timestamp = criadoEm
          ? new Date(criadoEm).toLocaleString('pt-BR')
          : new Date().toLocaleString('pt-BR');

        return {
          id: Number(n.id),
          mensagem: String(n.mensagem ?? ''),
          tipo,
          timestamp,
          lida: Boolean(n.lida),
          origem: 'db',
          link: n.link ?? null,
        } as Notificacao;
      })
      .filter(n => Number.isFinite(n.id));
  }

  const marcarNotificacaoComoLida = useCallback(
    async (id: number) => {
      const notif = notificacoes.find(n => n.id === id);

      // Sempre refletir no UI, mesmo se for notificação local
      setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: true } : n)));

      // Notificação local não existe no banco
      if (!notif || notif.origem === 'local') return;

      try {
        await api.marcarNotificacaoLida(id);
      } catch (error: any) {
        // Se falhar, desfaz no UI (melhor do que "fingir" que persistiu)
        setNotificacoes(prev => prev.map(n => (n.id === id ? { ...n, lida: false } : n)));
        throw error;
      }
    },
    [notificacoes]
  );

  const marcarTodasNotificacoesComoLidas = useCallback(async () => {
    const naoLidas = notificacoes.filter(n => !n.lida);
    if (naoLidas.length === 0) return;

    // Otimista no UI
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));

    const idsDb = naoLidas.filter(n => n.origem !== 'local').map(n => n.id);
    if (idsDb.length === 0) return;

    const resultados = await Promise.allSettled(idsDb.map(id => api.marcarNotificacaoLida(id)));
    const algumErro = resultados.some(r => r.status === 'rejected');
    if (algumErro) {
      // Se houver erro, recarrega do backend pra manter a verdade
      try {
        const notificacoesData = await api.getNotificacoes();
        const normalizadas = normalizarNotificacoesDoBackend(notificacoesData);
        setNotificacoes(prev => {
          const locais = prev.filter(n => n.origem === 'local');
          return [...normalizadas, ...locais];
        });
      } catch {
        // Se nem recarregar der, deixa tudo como lido no UI
      }
      throw new Error('Erro ao marcar algumas notificações como lidas');
    }
  }, [notificacoes]);

  // Carregar dados do back-end quando usuário estiver logado
  useEffect(() => {
    if (!usuarioLogado) return;

    let cancelled = false;

    async function carregarDados() {
      try {
        // Carrega o essencial em paralelo (reduz tempo de bloqueio inicial)
        const [departamentosRes, tagsRes, processosRes] = await Promise.allSettled([
          api.getDepartamentos(),
          api.getTags(),
          api.getProcessos(),
        ]);

        if (cancelled) return;

        if (departamentosRes.status === 'fulfilled') {
          setDepartamentos(departamentosRes.value || []);
        }

        if (tagsRes.status === 'fulfilled') {
          setTags(tagsRes.value || []);
        }

        if (processosRes.status === 'fulfilled') {
          setProcessos(processosRes.value || []);
        }

        // Carrega notificações sem bloquear a tela
        void (async () => {
          try {
            const notificacoesData = await api.getNotificacoes();
            if (cancelled) return;
            const normalizadas = normalizarNotificacoesDoBackend(notificacoesData);
            setNotificacoes(prev => {
              const locais = prev.filter(n => n.origem === 'local');
              return [...normalizadas, ...locais];
            });
          } catch (error) {
            if (cancelled) return;
            console.error('Erro ao carregar notificações:', error);
            // Mantém locais, mas não zera tudo
            setNotificacoes(prev => prev.filter(n => n.origem === 'local'));
          }
        })();

        // Carrega itens mais pesados depois (não bloqueia o primeiro render)
        void (async () => {
          const [empresasRes, templatesRes] = await Promise.allSettled([
            api.getEmpresas(),
            api.getTemplates(),
          ]);

          if (cancelled) return;

          if (empresasRes.status === 'fulfilled') {
            if (process.env.NODE_ENV !== 'production') {
              try {
                console.log('📊 Empresas carregadas:', empresasRes.value?.length || 0);
              } catch {
                // ignore
              }
            }
            setEmpresas(empresasRes.value || []);
          }

          if (templatesRes.status === 'fulfilled') {
            setTemplates(templatesRes.value || []);
          }
        })();

        // Admin: usuários também em background
        if (usuarioLogado.role === 'admin') {
          void (async () => {
            const usuariosRes = await Promise.allSettled([api.getUsuarios()]);
            if (cancelled) return;
            const r = usuariosRes[0];
            if (r.status === 'fulfilled') setUsuarios(r.value || []);
          })();
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    }

    void carregarDados();

    return () => {
      cancelled = true;
    };
  }, [usuarioLogado]);

  // Realtime: quando outro usuário mexer em um card (Processo), atualiza a lista automaticamente.
  // Implementação intencionalmente simples: ao receber qualquer evento na tabela, faz um refresh via API.
  // (Podemos evoluir para aplicar patch incremental sem refetch depois.)
  useEffect(() => {
    if (!usuarioLogado) return;

    const supabase = getSupabaseBrowserClient();
    setRealtimeInfo(prev => ({
      ...prev,
      enabled: !!supabase,
      processos: supabase ? 'connecting' : 'fallback',
    }));
    const startPolling = () => {
      if (processosPollingRef.current) return;
      processosPollingRef.current = setInterval(() => {
        void refreshProcessos();
      }, 5000);
      setRealtimeInfo(prev => ({ ...prev, processos: 'fallback' }));
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('[realtime] fallback polling ON (5s)');
        } catch {
          // ignore
        }
      }
    };

    const stopPolling = () => {
      if (!processosPollingRef.current) return;
      clearInterval(processosPollingRef.current);
      processosPollingRef.current = null;
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('[realtime] fallback polling OFF');
        } catch {
          // ignore
        }
      }
    };

    let ativo = true;

    const refreshProcessos = async () => {
      try {
        const processosData = await api.getProcessos();
        if (!ativo) return;
        setProcessos((prev) => {
          try {
            const existingMap = new Map<number, any>();
            (Array.isArray(prev) ? prev : []).forEach((p: any) => {
              if (p && Number.isFinite(p.id)) existingMap.set(Number(p.id), p);
            });

            const merged: any[] = [];
            (Array.isArray(processosData) ? processosData : []).forEach((p: any) => {
              const id = Number(p?.id);
              if (!Number.isFinite(id)) return;

              const existing = existingMap.get(id);

              // Preserve details (questionários/respostas/documentos) if already present in state
              const existingHasDetails = existing && (
                (Array.isArray(existing.questionarios) && existing.questionarios.length > 0) ||
                (existing.questionariosPorDepartamento && Object.keys(existing.questionariosPorDepartamento).length > 0) ||
                (existing.respostasHistorico && Object.keys(existing.respostasHistorico || {}).length > 0) ||
                (Array.isArray(existing.documentos) && existing.documentos.length > 0)
              );

              if (existingHasDetails) {
                merged.push(existing);
              } else {
                merged.push(p);
              }

              existingMap.delete(id);
            });

            // Append any leftover existing processes not present in the fetched list
            for (const leftover of existingMap.values()) merged.push(leftover);

            return merged;
          } catch (err) {
            return Array.isArray(processosData) ? processosData : [];
          }
        });
      } catch {
        // silencioso: se falhar momentaneamente, mantém estado atual
      }
    };

    const scheduleRefresh = () => {
      if (realtimeProcessosTimerRef.current) return;
      realtimeProcessosTimerRef.current = setTimeout(() => {
        realtimeProcessosTimerRef.current = null;
        void refreshProcessos();
      }, 250);
    };

    // Se não há config do Supabase no browser, ativa polling e pronto.
    if (!supabase) {
      startPolling();
      return () => {
        ativo = false;
        stopPolling();
      };
    }

    processosRealtimeStatusRef.current = 'idle';

    const channel = supabase
      .channel('realtime-processos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Processo' }, (payload) => {
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[realtime] Processo change', payload?.eventType);
          } catch {
            // ignore
          }
        }
        scheduleRefresh();
      })
      // O board também depende de outras tabelas (tags/comentários/histórico).
      // Ao mudar qualquer uma delas, fazemos refresh da lista.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'HistoricoFluxo' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'HistoricoEvento' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ProcessoTag' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Comentario' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Documento' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Notificacao' }, () => scheduleRefresh())
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[realtime] status', status);
          } catch {
            // ignore
          }
        }

        if (status === 'SUBSCRIBED') {
          processosRealtimeStatusRef.current = 'subscribed';
          setRealtimeInfo(prev => ({ ...prev, enabled: true, processos: 'connected' }));
          stopPolling();
          // Faz um refresh ao conectar, pra sincronizar.
          scheduleRefresh();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          processosRealtimeStatusRef.current = 'error';
          setRealtimeInfo(prev => ({ ...prev, enabled: true, processos: 'fallback' }));
          startPolling();
        }
      });

    // Se em alguns segundos não conectar, habilita polling como fallback.
    const fallbackTimer = setTimeout(() => {
      if (processosRealtimeStatusRef.current !== 'subscribed') startPolling();
    }, 5000);

    return () => {
      ativo = false;
      clearTimeout(fallbackTimer);
      if (realtimeProcessosTimerRef.current) {
        clearTimeout(realtimeProcessosTimerRef.current);
        realtimeProcessosTimerRef.current = null;
      }
      stopPolling();
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [usuarioLogado, setProcessos]);

  // Realtime (core): departamentos/tags/empresas/templates (ex.: deletar dept precisa refletir sem F5)
  useEffect(() => {
    if (!usuarioLogado) return;

    const supabase = getSupabaseBrowserClient();

    setRealtimeInfo(prev => ({
      ...prev,
      enabled: !!supabase,
      core: supabase ? 'connecting' : 'fallback',
    }));

    let ativo = true;

    const refreshCore = async () => {
      try {
        const [departamentosData, tagsData, empresasData, templatesData] = await Promise.all([
          api.getDepartamentos().catch(() => []),
          api.getTags().catch(() => []),
          api.getEmpresas().catch(() => []),
          api.getTemplates().catch(() => []),
        ]);
        if (!ativo) return;
        setDepartamentos(departamentosData || []);
        setTags(tagsData || []);
        setEmpresas(empresasData || []);
        setTemplates(templatesData || []);
      } catch {
        // silencioso
      }
    };

    const scheduleRefreshCore = () => {
      if (realtimeCoreTimerRef.current) return;
      realtimeCoreTimerRef.current = setTimeout(() => {
        realtimeCoreTimerRef.current = null;
        void refreshCore();
      }, 250);
    };

    const startCorePolling = () => {
      if (corePollingRef.current) return;
      corePollingRef.current = setInterval(() => {
        void refreshCore();
      }, 8000);
      setRealtimeInfo(prev => ({ ...prev, core: 'fallback' }));
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('[realtime] core fallback polling ON (8s)');
        } catch {
          // ignore
        }
      }
    };

    const stopCorePolling = () => {
      if (!corePollingRef.current) return;
      clearInterval(corePollingRef.current);
      corePollingRef.current = null;
    };

    // Sem supabase no browser: polling como fallback.
    if (!supabase) {
      startCorePolling();
      return () => {
        ativo = false;
        stopCorePolling();
      };
    }

    coreRealtimeStatusRef.current = 'idle';

    const channel = supabase
      .channel('realtime-core')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Departamento' }, () => scheduleRefreshCore())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Empresa' }, () => scheduleRefreshCore())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Tag' }, () => scheduleRefreshCore())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Template' }, () => scheduleRefreshCore())
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[realtime] core status', status);
          } catch {
            // ignore
          }
        }

        if (status === 'SUBSCRIBED') {
          coreRealtimeStatusRef.current = 'subscribed';
          setRealtimeInfo(prev => ({ ...prev, enabled: true, core: 'connected' }));
          stopCorePolling();
          scheduleRefreshCore();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          coreRealtimeStatusRef.current = 'error';
          setRealtimeInfo(prev => ({ ...prev, enabled: true, core: 'fallback' }));
          startCorePolling();
        }
      });

    const fallbackTimer = setTimeout(() => {
      if (coreRealtimeStatusRef.current !== 'subscribed') startCorePolling();
    }, 5000);

    return () => {
      ativo = false;
      clearTimeout(fallbackTimer);
      if (realtimeCoreTimerRef.current) {
        clearTimeout(realtimeCoreTimerRef.current);
        realtimeCoreTimerRef.current = null;
      }
      stopCorePolling();
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [usuarioLogado, setDepartamentos, setEmpresas, setTags, setTemplates]);

  // Notificações: realtime (Supabase) + fallback polling.
  useEffect(() => {
    if (!usuarioLogado) {
      setRealtimeInfo(prev => ({ ...prev, notificacoes: 'disabled' }));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setRealtimeInfo(prev => ({
      ...prev,
      enabled: !!supabase,
      notificacoes: supabase ? 'connecting' : 'fallback',
    }));

    let ativo = true;
    const intervalMs = 15000;

    const stopPolling = () => {
      if (!notificacoesPollingRef.current) return;
      clearInterval(notificacoesPollingRef.current);
      notificacoesPollingRef.current = null;
    };

    const startPolling = () => {
      if (notificacoesPollingRef.current) return;
      notificacoesPollingRef.current = setInterval(() => {
        void tick();
      }, intervalMs);
      setRealtimeInfo(prev => ({ ...prev, notificacoes: 'fallback' }));
    };

    const tick = async () => {
      try {
        const notificacoesData = await api.getNotificacoes();
        if (!ativo) return;

        const normalizadas = normalizarNotificacoesDoBackend(notificacoesData);

        // Detectar novas notificações do banco (ids que ainda não existiam no estado)
        const prevDbIds = new Set(
          notificacoesRef.current
            .filter(n => n.origem === 'db')
            .map(n => n.id)
        );
        const novas = normalizadas.filter(n => !prevDbIds.has(n.id) && !n.lida);

        setNotificacoes(prev => {
          const locais = prev.filter(n => n.origem === 'local');
          return [...normalizadas, ...locais];
        });

        // Notificação do navegador (apenas enquanto o Chrome estiver aberto)
        const enabled = notificacoesNavegadorAtivas;
        if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          for (const n of novas) {
            try {
              new Notification('Sistema - Nova notificação', {
                body: String(n.mensagem ?? ''),
              });
            } catch {
              // se falhar, ignora
            }
          }
        }
      } catch {
        // Silencioso: não queremos poluir o usuário por erro intermitente
      }
    };

    const scheduleTick = () => {
      if (realtimeNotificacoesTimerRef.current) return;
      realtimeNotificacoesTimerRef.current = setTimeout(() => {
        realtimeNotificacoesTimerRef.current = null;
        void tick();
      }, 250);
    };

    // roda uma vez rápido
    void tick();

    // Sem supabase no browser: polling como fallback.
    if (!supabase) {
      startPolling();
      return () => {
        ativo = false;
        stopPolling();
      };
    }

    notificacoesRealtimeStatusRef.current = 'idle';

    const channel = supabase
      .channel(`realtime-notificacoes-${usuarioLogado.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Notificacao', filter: `usuarioId=eq.${usuarioLogado.id}` },
        () => scheduleTick()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          notificacoesRealtimeStatusRef.current = 'subscribed';
          setRealtimeInfo(prev => ({ ...prev, enabled: true, notificacoes: 'connected' }));
          stopPolling();
          scheduleTick();
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          notificacoesRealtimeStatusRef.current = 'error';
          setRealtimeInfo(prev => ({ ...prev, enabled: true, notificacoes: 'fallback' }));
          startPolling();
        }
      });

    const fallbackTimer = setTimeout(() => {
      if (notificacoesRealtimeStatusRef.current !== 'subscribed') startPolling();
    }, 5000);

    return () => {
      ativo = false;
      clearTimeout(fallbackTimer);
      if (realtimeNotificacoesTimerRef.current) {
        clearTimeout(realtimeNotificacoesTimerRef.current);
        realtimeNotificacoesTimerRef.current = null;
      }
      stopPolling();
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [usuarioLogado, notificacoesNavegadorAtivas]);

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
  }, [adicionarNotificacao]);

  const atualizarEmpresa = useCallback(async (empresaId: number, dados: Partial<Empresa>) => {
    try {
      const atualizada = await api.atualizarEmpresa(empresaId, dados);
      setEmpresas(prev => prev.map(e => e.id === empresaId ? atualizada : e));
      adicionarNotificacao('Empresa atualizada com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao atualizar empresa', 'erro');
      throw error;
    }
  }, [adicionarNotificacao]);

  const excluirEmpresa = useCallback(async (empresaId: number) => {
    try {
      await api.excluirEmpresa(empresaId);
      setEmpresas(prev => prev.filter(e => e.id !== empresaId));
      adicionarNotificacao('Empresa excluída com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao excluir empresa', 'erro');
      throw error;
    }
  }, [adicionarNotificacao]);

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
    [adicionarNotificacao]
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
  }, [adicionarNotificacao]);

  const atualizarProcesso = useCallback(async (processoId: number, dados: Partial<Processo>) => {
    try {
      const atualizado = await api.atualizarProcesso(processoId, dados);
      setProcessos(prev => prev.map(p => p.id === processoId ? atualizado : p));
      adicionarNotificacao('Processo atualizado com sucesso', 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao atualizar processo', 'erro');
      throw error;
    }
  }, [adicionarNotificacao]);

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
          questionariosPorDepartamento: (dados as any).questionariosPorDepartamento,
          personalizado: (dados as any).personalizado,
          templateId: (dados as any).templateId,
          status: dados.status || 'EM_ANDAMENTO',
          prioridade: dados.prioridade?.toUpperCase() || 'MEDIA',
          departamentoAtual: departamentoInicial,
          departamentoAtualIndex: 0,
          fluxoDepartamentos: fluxo,
          descricao: dados.descricao,
          notasCriador: dados.notasCriador,
        });

        // UI otimista: insere imediatamente (não bloqueia a experiência)
        setProcessos(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          if (arr.some(p => p.id === novo.id)) return arr;
          return [novo, ...arr];
        });

        // Refresh em background (não aguarda) para sincronizar com o backend
        void (async () => {
          try {
            const processosData = await api.getProcessos();
            setProcessos(processosData || []);
          } catch {
            // silencioso
          }
        })();
        
        adicionarNotificacao('Processo criado com sucesso', 'sucesso');
        return novo;
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao criar processo', 'erro');
        throw error;
      }
    },
    [departamentos, adicionarNotificacao]
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
  }, [adicionarNotificacao]);

  const avancarParaProximoDepartamento = useCallback(
    async (processoId: number) => {
      try {
        setGlobalLoading(true);
        await api.avancarProcesso(processoId);
        // Recarrega o processo completo para manter documentos/anexos e histórico
        const processoAtualizado = await api.getProcesso(processoId);
        setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
        adicionarNotificacao('Processo avançado para próximo departamento', 'sucesso');
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao avançar processo', 'erro');
        throw error;
      } finally {
        setGlobalLoading(false);
      }
    },
    [adicionarNotificacao]
  );

  const finalizarProcesso = useCallback(async (processoId: number) => {
    try {
      setGlobalLoading(true);
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
    } finally {
      setGlobalLoading(false);
    }
  }, [adicionarNotificacao]);

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
  }, [adicionarNotificacao]);

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
    [processos, adicionarNotificacao]
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
  }, [processos, adicionarNotificacao]);

  const value: SistemaContextType = {
    processos,
    empresas,
    templates,
    departamentos,
    tags,
    usuarios,
    notificacoes,
    usuarioLogado,
    realtimeInfo,

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
    marcarNotificacaoComoLida,
    marcarTodasNotificacoesComoLidas,
    notificacoesNavegadorAtivas,
    ativarNotificacoesNavegador,
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
    globalLoading,
    setGlobalLoading,
    aplicarTagsProcesso,
    adicionarComentarioProcesso,
    adicionarDocumentoProcesso,
  };

  return (
    <SistemaContext.Provider value={value}>
      <div className="relative">
        <LoadingOverlay show={globalLoading} text="Processando..." />
        {children}
      </div>
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
