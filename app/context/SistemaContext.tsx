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
  showLixeira: boolean;

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
  setShowLixeira: (show: boolean) => void;

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
  carregarEmpresas: () => Promise<void>;
  criarTemplate: (dados: {
    nome: string;
    descricao?: string;
    fluxoDepartamentos: number[];
    questionariosPorDepartamento: any;
  }) => Promise<Template>;
  excluirTemplate: (templateId: number) => Promise<void>;
  criarProcesso: (dados: Partial<Processo>) => Promise<Processo>;
  atualizarProcesso: (processoId: number, dados: Partial<Processo>) => Promise<void>;
  excluirProcesso: (processoId: number, motivoExclusao?: string, motivoExclusaoCustom?: string) => Promise<void>;
  avancarParaProximoDepartamento: (processoId: number) => Promise<void>;
  finalizarProcesso: (processoId: number) => Promise<{ finalizado: boolean; processoId: number; interligadoComId: number | null; interligadoParalelo: boolean; processoNome: string } | void>;
  globalLoading: boolean;
  setGlobalLoading: (v: boolean) => void;
  aplicarTagsProcesso: (processoId: number, tags: number[]) => Promise<void>;
  adicionarComentarioProcesso: (processoId: number, texto: string, mencoes?: string[]) => Promise<void>;
  voltarParaDepartamentoAnterior: (processoId: number) => Promise<void>;
  adicionarDocumentoProcesso: (processoId: number, arquivo: File, tipo: string, departamentoId?: number, perguntaId?: number, meta?: { visibility?: string; allowedRoles?: string[]; allowedUserIds?: number[] }) => Promise<any>;
  inicializandoUsuario: boolean;
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
  const [inicializandoUsuario, setInicializandoUsuario] = useState(true);
  const notificacoesRef = useRef<Notificacao[]>([]);
  const realtimeProcessosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPreserveDetailsRef = useRef<boolean>(false);
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
  const [showLixeira, setShowLixeira] = useState(false);

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

  // DEBUG: expõe `processos` no window para inspeção rápida durante desenvolvimento
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      try {
        (window as any).__SISTEMA_PROCESSOS = processos;
        console.debug('SistemaContext - processos expostos em window.__SISTEMA_PROCESSOS (dev) - total:', Array.isArray(processos) ? processos.length : 0);
      } catch {}
    }
  }, [processos]);

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
          processoId: (typeof n.processoId === 'number' ? Number(n.processoId) : n.processoId ?? null) as any,
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

        // Carrega lista de usuários em background para perfis que gerenciam anexos
        // (antes era somente `admin` — agora também carregamos para `gerente`)
        if (usuarioLogado && (usuarioLogado.role === 'admin' || usuarioLogado.role === 'gerente')) {
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

  // Tenta restaurar sessão do usuário a partir do cookie httpOnly
  useEffect(() => {
    (async () => {
      try {
        if (typeof window === 'undefined') return setInicializandoUsuario(false);
        try {
          const me = await api.getMe();
          if (me && me.id) {
            // Normaliza role para lowercase para compatibilidade com checagens no front
            const normalized = { ...(me as any), role: String((me as any).role || '').toLowerCase() } as any;
            setUsuarioLogado(normalized);
          }
        } catch (err) {
          // Cookie inválido/expirado — sessão não existe
        }
      } finally {
        setInicializandoUsuario(false);
      }
    })();
  }, []);

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
              // Decide se preservamos o objeto existente (com detalhes locais)
              const existingHasDetails = existing && !skipPreserveDetailsRef.current && (
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

            // Reset flag after applying a merge that used it
            skipPreserveDetailsRef.current = false;

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
    console.log('[realtime] Processo change', payload?.eventType, payload);
  }
  
  // DELETE: remove imediatamente do estado
  if (payload?.eventType === 'DELETE' && payload.old?.id) {
    setProcessos(prev => prev.filter(p => p.id !== payload.old.id));
    return; // não precisa fazer refresh
  }
  
  // INSERT/UPDATE: faz refresh normal
  scheduleRefresh();
})
      // O board também depende de outras tabelas (tags/comentários/histórico).
      // Ao mudar qualquer uma delas, fazemos refresh da lista.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'HistoricoFluxo' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'HistoricoEvento' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ProcessoTag' }, (payload) => {
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[realtime] ProcessoTag change', payload?.eventType, payload);
          } catch {}
        }
        scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Comentario' }, () => scheduleRefresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Documento' }, (payload) => {
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.log('[realtime] Documento change', payload?.eventType, payload);
          } catch {}
        }
        // Quando documentos mudam, não preservamos o array `documentos` existente
        // para evitar manter itens já removidos localmente. Força refresh completo.
        skipPreserveDetailsRef.current = true;
        scheduleRefresh();
      })
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
// TESTE TEMPORÁRIO - adicione após o useEffect de processos
useEffect(() => {
  const supabase = getSupabaseBrowserClient();
  console.log('🔍 [DEBUG] Supabase client:', supabase ? 'OK' : 'NULL');
  console.log('🔍 [DEBUG] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔍 [DEBUG] SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Definida' : 'Não definida');
}, []);
  const criarEmpresa = useCallback(async (dados: Partial<Empresa>) => {
    try {
      const nova = await api.salvarEmpresa(dados);
      setEmpresas(prev => [...prev, nova]);
      adicionarNotificacao('Empresa criada com sucesso', 'sucesso');
      api.registrarLog?.({ acao: 'CRIAR', entidade: 'EMPRESA', entidadeId: nova.id, entidadeNome: (nova as any).razao_social });
      return nova;
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao criar empresa', 'erro');
      throw error;
    }
  }, [adicionarNotificacao]);

  const atualizarEmpresa = useCallback(async (empresaId: number, dados: Partial<Empresa>) => {
    try {
      const empresaAnterior = empresas.find(e => e.id === empresaId);
      const atualizada = await api.atualizarEmpresa(empresaId, dados);
      setEmpresas(prev => prev.map(e => e.id === empresaId ? atualizada : e));
      adicionarNotificacao('Empresa atualizada com sucesso', 'sucesso');

      // Log detalhado campo a campo
      const LABELS_EMPRESA: Record<string, string> = {
        razao_social: 'Razão Social', apelido: 'Nome Fantasia', cnpj: 'CNPJ', codigo: 'Código',
        inscricao_estadual: 'Inscrição Estadual', inscricao_municipal: 'Inscrição Municipal',
        regime_federal: 'Regime Federal', regime_estadual: 'Regime Estadual', regime_municipal: 'Regime Municipal',
        estado: 'Estado', cidade: 'Cidade', bairro: 'Bairro', logradouro: 'Logradouro',
        numero: 'Número', cep: 'CEP', email: 'Email', telefone: 'Telefone', data_abertura: 'Data Abertura',
      };
      const camposAlterados: string[] = [];
      for (const [campo, valorNovo] of Object.entries(dados)) {
        const valorAnterior = empresaAnterior ? String((empresaAnterior as any)[campo] ?? '') : '';
        const valorNovoStr = String(valorNovo ?? '');
        if (valorAnterior !== valorNovoStr) {
          camposAlterados.push(`${LABELS_EMPRESA[campo] || campo}: "${valorAnterior || '(vazio)'}" → "${valorNovoStr || '(vazio)'}"`);
          api.registrarLog?.({
            acao: 'EDITAR', entidade: 'EMPRESA', entidadeId: empresaId,
            entidadeNome: empresaAnterior?.razao_social || atualizada?.razao_social,
            campo: LABELS_EMPRESA[campo] || campo,
            valorAnterior: valorAnterior || '(vazio)',
            valorNovo: valorNovoStr || '(vazio)',
            empresaId: empresaId,
            detalhes: `Campo "${LABELS_EMPRESA[campo] || campo}" alterado de "${valorAnterior || '(vazio)'}" para "${valorNovoStr || '(vazio)'}"`,
          });
        }
      }
      if (camposAlterados.length === 0) {
        api.registrarLog?.({ acao: 'EDITAR', entidade: 'EMPRESA', entidadeId: empresaId, entidadeNome: empresaAnterior?.razao_social, detalhes: 'Nenhum campo alterado' });
      }
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao atualizar empresa', 'erro');
      throw error;
    }
  }, [adicionarNotificacao, empresas]);

  const excluirEmpresa = useCallback(async (empresaId: number) => {
    try {
      await api.excluirEmpresa(empresaId);
      setEmpresas(prev => prev.filter(e => e.id !== empresaId));
      adicionarNotificacao('Empresa excluída com sucesso', 'sucesso');
      const empresaExcluida = empresas.find(e => e.id === empresaId);
      api.registrarLog?.({
        acao: 'EXCLUIR', entidade: 'EMPRESA', entidadeId: empresaId,
        entidadeNome: empresaExcluida?.razao_social,
        empresaId: empresaId,
        detalhes: `Empresa excluída: "${empresaExcluida?.razao_social || '#' + empresaId}"${empresaExcluida?.cnpj ? ' | CNPJ: ' + empresaExcluida.cnpj : ''}`,
      });
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao excluir empresa', 'erro');
      throw error;
    }
  }, [adicionarNotificacao]);

  const carregarEmpresas = useCallback(async () => {
    try {
      const data = await api.getEmpresas();
      setEmpresas(data || []);
    } catch {
      // silencioso
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
        api.registrarLog?.({ acao: 'CRIAR', entidade: 'TEMPLATE', entidadeId: novo.id, entidadeNome: dados.nome });
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
      const templateExcluido = templates.find(t => t.id === templateId);
      api.registrarLog?.({
        acao: 'EXCLUIR', entidade: 'TEMPLATE', entidadeId: templateId,
        entidadeNome: templateExcluido?.nome,
        detalhes: `Template excluído: "${templateExcluido?.nome || '#' + templateId}"`,
      });
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao excluir template', 'erro');
      throw error;
    }
  }, [adicionarNotificacao]);

  const atualizarProcesso = useCallback(async (processoId: number, dados: Partial<Processo>) => {
    try {
      const processoAnterior = processos.find(p => p.id === processoId);
      const atualizado = await api.atualizarProcesso(processoId, dados);
      setProcessos(prev => prev.map(p => p.id === processoId ? atualizado : p));
      adicionarNotificacao('Processo atualizado com sucesso', 'sucesso');

      // Log detalhado campo a campo
      const LABELS_PROCESSO: Record<string, string> = {
        nomeEmpresa: 'Nome Empresa', nomeServico: 'Nome Serviço', nome: 'Nome',
        cliente: 'Cliente', email: 'Email', telefone: 'Telefone',
        status: 'Status', prioridade: 'Prioridade', descricao: 'Descrição',
        notasCriador: 'Notas do Criador', responsavelId: 'Responsável',
        departamentoAtual: 'Departamento Atual', dataEntrega: 'Data de Entrega',
        progresso: 'Progresso', empresaId: 'Empresa',
        interligadoComId: 'Interligado com', interligadoNome: 'Nome Interligação',
        deptIndependente: 'Departamentos Independentes',
      };
      const camposIgnorar = ['questionariosPorDepartamento', 'fluxoDepartamentos', 'dataAtualizacao', 'dataFinalizacao'];
      const camposAlterados: string[] = [];
      for (const [campo, valorNovo] of Object.entries(dados)) {
        if (camposIgnorar.includes(campo)) continue;
        const valorAnterior = processoAnterior ? String((processoAnterior as any)[campo] ?? '') : '';
        const valorNovoStr = String(valorNovo ?? '');
        if (valorAnterior !== valorNovoStr) {
          const label = LABELS_PROCESSO[campo] || campo;
          let displayAnterior = valorAnterior || '(vazio)';
          let displayNovo = valorNovoStr || '(vazio)';
          // Traduzir responsavelId para nome
          if (campo === 'responsavelId') {
            const respAnterior = usuarios.find(u => u.id === Number(valorAnterior));
            const respNovo = usuarios.find(u => u.id === Number(valorNovo));
            if (respAnterior) displayAnterior = respAnterior.nome;
            if (respNovo) displayNovo = respNovo.nome;
          }
          // Traduzir departamentoAtual para nome
          if (campo === 'departamentoAtual') {
            const deptAnt = departamentos.find(d => d.id === Number(valorAnterior));
            const deptNovo = departamentos.find(d => d.id === Number(valorNovo));
            if (deptAnt) displayAnterior = deptAnt.nome;
            if (deptNovo) displayNovo = deptNovo.nome;
          }
          camposAlterados.push(`${label}: "${displayAnterior}" → "${displayNovo}"`);
          api.registrarLog?.({
            acao: 'EDITAR', entidade: 'PROCESSO', entidadeId: processoId,
            entidadeNome: processoAnterior?.nomeEmpresa || processoAnterior?.nome || atualizado?.nomeEmpresa,
            campo: label,
            valorAnterior: displayAnterior,
            valorNovo: displayNovo,
            processoId: processoId,
            detalhes: `Campo "${label}" alterado de "${displayAnterior}" para "${displayNovo}"`,
          });
        }
      }
      if (camposAlterados.length === 0) {
        api.registrarLog?.({ acao: 'EDITAR', entidade: 'PROCESSO', entidadeId: processoId, entidadeNome: processoAnterior?.nomeEmpresa || processoAnterior?.nome, detalhes: 'Nenhum campo alterado' });
      }
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao atualizar processo', 'erro');
      throw error;
    }
  }, [adicionarNotificacao, processos, usuarios, departamentos]);

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
          responsavelId: (dados as any).responsavelId,
          criadoPor: (dados as any).criadoPor ?? usuarioLogado?.nome,
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
          dataEntrega: (dados as any).dataEntrega, // Prazo de entrega
          interligadoComId: (dados as any).interligadoComId,
          interligadoNome: (dados as any).interligadoNome,
          interligadoParalelo: (dados as any).interligadoParalelo,
          deptIndependente: (dados as any).deptIndependente,
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
        api.registrarLog?.({
          acao: 'CRIAR', entidade: 'PROCESSO', entidadeId: novo.id,
          entidadeNome: novo.nomeEmpresa || novo.nome,
          processoId: novo.id,
          detalhes: `Processo criado: "${novo.nomeEmpresa || novo.nome || '#' + novo.id}" | Status: ${novo.status || 'em_andamento'} | Prioridade: ${novo.prioridade || 'media'}${novo.cliente ? ' | Cliente: ' + novo.cliente : ''}${novo.email ? ' | Email: ' + novo.email : ''}`,
        });
        return novo;
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao criar processo', 'erro');
        throw error;
      }
    },
    [departamentos, adicionarNotificacao, usuarioLogado]
  );

  const excluirProcesso = useCallback(async (processoId: number, motivoExclusao?: string, motivoExclusaoCustom?: string) => {
    try {
      await api.excluirProcesso(processoId, motivoExclusao, motivoExclusaoCustom);
      setProcessos(prev => prev.filter(p => p.id !== processoId));
      adicionarNotificacao('Processo excluído com sucesso', 'sucesso');

      // Registrar log de auditoria
      api.registrarLog?.({
        acao: 'EXCLUIR',
        entidade: 'PROCESSO',
        entidadeId: processoId,
        detalhes: motivoExclusao ? `Motivo: ${motivoExclusao}${motivoExclusaoCustom ? ` - ${motivoExclusaoCustom}` : ''}` : undefined,
      });
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao excluir processo', 'erro');
      throw error;
    }
  }, [adicionarNotificacao]);

  const avancarParaProximoDepartamento = useCallback(
    async (processoId: number) => {
      // Validação: antes de avançar, verificar se o questionário do departamento atual
      // possui perguntas obrigatórias não respondidas. Se sim, bloqueia o avanço.
      try {
        // Busca o processo completo no backend para garantir que temos questionários e respostas atualizadas
        const processoAtualizado = await api.getProcesso(processoId).catch(() => null);
        const processoDados = processoAtualizado ?? processos.find(p => p.id === processoId);
        if (processoDados) {
          const deptId = Number(processoDados.departamentoAtual ?? processoDados.departamento_atual ?? 0);
          const questionariosPD = (processoDados.questionariosPorDepartamento && (processoDados.questionariosPorDepartamento[String(deptId)] ?? processoDados.questionariosPorDepartamento[deptId]))
            || (processoDados.questionarioSolicitacao ?? processoDados.questionario ?? processoDados.questionarios) || [];

          const respostasSalvas = ((processoDados.respostasHistorico as any)?.[deptId]?.respostas) || {};

          const avaliarCondicaoLocal = (pergunta: any, respostasAtuais: Record<string, any>) => {
            if (!pergunta || !pergunta.condicao) return true;
            const { perguntaId, operador, valor } = pergunta.condicao;
            const respostaCond = respostasAtuais[String(perguntaId)];
            if (respostaCond === undefined || respostaCond === null || respostaCond === '') return false;
            const r = String(respostaCond).trim().toLowerCase();
            const v = String(valor).trim().toLowerCase();
            switch (operador) {
              case 'igual': return r === v;
              case 'diferente': return r !== v;
              case 'contem': return r.includes(v);
              default: return true;
            }
          };

          const docs = Array.isArray(processoDados.documentos) ? processoDados.documentos : [];

          const faltando = (Array.isArray(questionariosPD) ? questionariosPD : [])
            .filter((p: any) => p && p.obrigatorio)
            .filter((p: any) => {
              if (!avaliarCondicaoLocal(p, respostasSalvas)) return false;
              if (p.tipo === 'file') {
                const anexosVisiveis = docs.filter((d: any) => {
                  const dPerg = Number(d?.perguntaId ?? d?.pergunta_id);
                  if (dPerg !== Number(p.id)) return false;
                  const dDeptRaw = d?.departamentoId ?? d?.departamento_id;
                  const dDept = Number(dDeptRaw);
                  if (!Number.isFinite(dDept)) return true;
                  return dDept === deptId;
                });
                // Se houver anexos visíveis para o usuário, não está faltando
                if (anexosVisiveis.length > 0) return false;

                // Caso contrário, consultar o mapa de contagens retornado pelo backend
                const counts: Record<string, number> = (processoDados as any)?.documentosCounts ?? {};
                const keySpecific = `${Number(p.id)}:${Number(deptId)}`;
                const keyAny = `${Number(p.id)}:0`;
                const total = Number(counts[keySpecific] ?? counts[keyAny] ?? 0);
                // Se existe pelo menos um anexo (mesmo que restrito), considera como respondido
                return total === 0;
              }
              const r = respostasSalvas[String(p.id)];
              if (r === null || r === undefined) return true;
              if (typeof r === 'string' && !r.trim()) return true;
              return false;
            });

          if (faltando.length > 0) {
            const nomes = faltando.map((p: any) => p.label).join(', ');
            if (process.env.NODE_ENV !== 'production') {
              try {
                console.debug('[validação] faltando perguntas obrigatórias antes de avançar', { processoId, deptId, faltandoCount: faltando.length, faltando: faltando.map((p:any)=>({id:p.id,label:p.label})) });
              } catch {}
            }
            try {
              await mostrarAlerta?.('Campos obrigatórios', `Preencha os campos obrigatórios antes de avançar: ${nomes}`, 'aviso');
            } catch {
              // noop
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Validação de questionário falhou:', err);
      }
      try {
        setGlobalLoading(true);
        const processoAntes = processos.find(p => p.id === processoId);
        await api.avancarProcesso(processoId);
        // Recarrega o processo completo para manter documentos/anexos e histórico
        const processoAtualizado = await api.getProcesso(processoId);
        setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
        adicionarNotificacao('Processo avançado para próximo departamento', 'sucesso');
        const deptOrigem = departamentos.find(d => d.id === processoAntes?.departamentoAtual);
        const deptDestino = departamentos.find(d => d.id === processoAtualizado?.departamentoAtual);
        api.registrarLog?.({
          acao: 'AVANCAR', entidade: 'PROCESSO', entidadeId: processoId,
          entidadeNome: processoAntes?.nomeEmpresa || processoAntes?.nome,
          processoId: processoId,
          campo: 'Departamento',
          valorAnterior: deptOrigem?.nome || String(processoAntes?.departamentoAtual ?? ''),
          valorNovo: deptDestino?.nome || String(processoAtualizado?.departamentoAtual ?? ''),
          detalhes: `Processo avançado de "${deptOrigem?.nome || '?'}" para "${deptDestino?.nome || '?'}"`,
        });
      } catch (error: any) {
        const msg = error.message || 'Erro ao avançar processo';
        // Se a mensagem contém detalhes de validação, mostrar alerta mais detalhado
        if (msg.includes('Requisitos obrigatórios') || msg.includes('obrigatória') || msg.includes('obrigatório')) {
          try {
            await mostrarAlerta?.('Campos obrigatórios', msg, 'aviso');
          } catch {
            // noop
          }
        } else {
          adicionarNotificacao(msg, 'erro');
        }
      } finally {
        setGlobalLoading(false);
      }
    },
    [adicionarNotificacao, mostrarAlerta, processos, setProcessos, setGlobalLoading]
  );

  const finalizarProcesso = useCallback(async (processoId: number) => {
    try {
      setGlobalLoading(true);
      
      // ============================================
      // VALIDAR REQUISITOS ANTES DE FINALIZAR
      // ============================================
      
      // Buscar processo COMPLETO da API (não do estado)
      const processoCompleto = await api.getProcesso(processoId);
      
      // Importar função de validação
      const { validarAvancoDepartamento } = await import('@/app/utils/validation');
      const documentos = processoCompleto.documentos || [];

      // ============================================
      // PROCESSO PARALELO (deptIndependente): validar TODOS os departamentos do fluxo
      // ============================================
      if (processoCompleto.deptIndependente) {
        const fluxoIds: number[] = (Array.isArray(processoCompleto.fluxoDepartamentos)
          ? processoCompleto.fluxoDepartamentos : []).map(Number).filter(Number.isFinite);

        const errosGlobais: string[] = [];

        for (const deptId of fluxoIds) {
          const dept = departamentos.find(d => d.id === deptId);
          if (!dept) continue;

          const questionariosDoDept = processoCompleto.questionariosPorDepartamento?.[deptId] || [];
          const respostasDoDept = processoCompleto.respostasHistorico?.[deptId]?.respostas || {};

          const perguntasObrigatorias = questionariosDoDept.filter((q: any) => q.obrigatorio);
          const documentosObrigatorios = dept.documentosObrigatorios || [];

          if (perguntasObrigatorias.length > 0 || documentosObrigatorios.length > 0) {
            const validacao = validarAvancoDepartamento({
              processo: processoCompleto as any,
              departamento: dept,
              questionarios: questionariosDoDept.map((q: any) => ({
                id: q.id,
                label: q.label || 'Pergunta',
                tipo: q.tipo || 'text',
                obrigatorio: q.obrigatorio || false,
                opcoes: Array.isArray(q.opcoes) ? q.opcoes : [],
                condicao: q.condicao || (q.condicaoPerguntaId ? {
                  perguntaId: q.condicaoPerguntaId,
                  operador: q.condicaoOperador || 'igual',
                  valor: q.condicaoValor || '',
                } : undefined),
              })),
              documentos: documentos,
              respostas: respostasDoDept,
            });

            if (!validacao.valido) {
              const criticos = validacao.erros.filter(e => e.tipo === 'erro');
              if (criticos.length > 0) {
                errosGlobais.push(`📌 ${dept.nome}:\n${criticos.map(e => `  • ${e.mensagem}`).join('\n')}`);
              }
            }
          }
        }

        if (errosGlobais.length > 0) {
          setGlobalLoading(false);
          await mostrarAlerta(
            'Requisitos Obrigatórios Pendentes',
            `Complete os seguintes itens antes de finalizar:\n\n${errosGlobais.join('\n\n')}`,
            'erro'
          );
          return;
        }
      } else {
        // ============================================
        // PROCESSO NORMAL: validar apenas o departamento atual
        // ============================================
        const departamentoAtual = departamentos.find(d => d.id === processoCompleto.departamentoAtual);

        if (departamentoAtual) {
          const questionarios = processoCompleto.questionariosPorDepartamento?.[departamentoAtual.id] || [];
          const respostas = processoCompleto.respostasHistorico?.[departamentoAtual.id]?.respostas || {};

          const perguntasObrigatorias = questionarios.filter((q: any) => q.obrigatorio);
          const documentosObrigatorios = departamentoAtual.documentosObrigatorios || [];

          if (perguntasObrigatorias.length > 0 || documentosObrigatorios.length > 0) {
            const validacao = validarAvancoDepartamento({
              processo: processoCompleto as any,
              departamento: departamentoAtual,
              questionarios: questionarios.map((q: any) => ({
                id: q.id,
                label: q.label || 'Pergunta',
                tipo: q.tipo || 'text',
                obrigatorio: q.obrigatorio || false,
                opcoes: Array.isArray(q.opcoes) ? q.opcoes : [],
                condicao: q.condicao || (q.condicaoPerguntaId ? {
                  perguntaId: q.condicaoPerguntaId,
                  operador: q.condicaoOperador || 'igual',
                  valor: q.condicaoValor || '',
                } : undefined),
              })),
              documentos: documentos,
              respostas: respostas,
            });

            if (!validacao.valido) {
              const errosCriticos = validacao.erros.filter(e => e.tipo === 'erro');
              const mensagem = errosCriticos.map(e => e.mensagem).join('\n');

              setGlobalLoading(false);
              await mostrarAlerta(
                'Requisitos Obrigatórios Pendentes',
                `Complete os seguintes itens antes de finalizar:\n\n${mensagem}`,
                'erro'
              );
              return;
            }
          }
        }
      }
      
      // ============================================
      // VALIDAÇÃO PASSOU - FINALIZAR PROCESSO
      // ============================================
      
      await api.atualizarProcesso(processoId, {
        status: 'FINALIZADO' as any,
        dataFinalizacao: new Date(),
        progresso: 100,
      });
      
      // Recarrega o processo atualizado
      const processoAtualizado = await api.getProcesso(processoId);
      setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
      
      adicionarNotificacao('Processo finalizado com sucesso', 'sucesso');
      api.registrarLog?.({
        acao: 'FINALIZAR', entidade: 'PROCESSO', entidadeId: processoId,
        entidadeNome: processoCompleto.nomeEmpresa || processoCompleto.nome,
        processoId: processoId,
        campo: 'Status',
        valorAnterior: processoCompleto.status || 'em_andamento',
        valorNovo: 'finalizado',
        detalhes: `Processo "${processoCompleto.nomeEmpresa || processoCompleto.nome || '#' + processoId}" finalizado com sucesso. Progresso: 100%`,
      });

      // Retornar info sobre interligação para o caller decidir mostrar modal
      return {
        finalizado: true,
        processoId,
        interligadoComId: processoCompleto.interligadoComId ?? null,
        interligadoParalelo: !!(processoCompleto as any).interligadoParalelo,
        processoNome: processoCompleto.nomeEmpresa || processoCompleto.nome || `#${processoId}`,
      };
    } catch (error: any) {
      console.error('Erro ao finalizar:', error);
      adicionarNotificacao(error.message || 'Erro ao finalizar processo', 'erro');
      throw error;
    } finally {
      setGlobalLoading(false);
    }
  }, [adicionarNotificacao, departamentos, mostrarAlerta]);

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

      // Log detalhado de tags
      const processoAnterior = processos.find(p => p.id === processoId);
      const tagsAnteriores = (processoAnterior?.tagsMetadata || []).map(t => t.nome).join(', ') || '(nenhuma)';
      const tagsNovas = (processo?.tagsMetadata || []).map((t: any) => t.nome).join(', ') || tags.filter(t => novasTags.includes(t.id)).map(t => t.nome).join(', ') || novasTags.join(', ');
      api.registrarLog?.({
        acao: 'TAG', entidade: 'PROCESSO', entidadeId: processoId,
        entidadeNome: processoAnterior?.nomeEmpresa || processoAnterior?.nome,
        processoId: processoId,
        campo: 'Tags',
        valorAnterior: tagsAnteriores,
        valorNovo: tagsNovas || '(nenhuma)',
        detalhes: `Tags alteradas de [${tagsAnteriores}] para [${tagsNovas || '(nenhuma)'}]`,
      });
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao aplicar tags', 'erro');
      throw error;
    }
  }, [adicionarNotificacao, processos, tags]);

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

        // Log detalhado de comentário
        const preview = texto.length > 100 ? texto.substring(0, 100) + '...' : texto;
        const deptComentario = departamentos.find(d => d.id === processo?.departamentoAtual);
        api.registrarLog?.({
          acao: 'COMENTAR', entidade: 'PROCESSO', entidadeId: processoId,
          entidadeNome: processo?.nomeEmpresa || processo?.nome,
          processoId: processoId,
          campo: 'Comentário',
          valorNovo: preview,
          detalhes: `Comentário adicionado no departamento "${deptComentario?.nome || '?'}": "${preview}"${mencoes && mencoes.length > 0 ? ` | Menções: ${mencoes.join(', ')}` : ''}`,
        });
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao adicionar comentário', 'erro');
        throw error;
      }
    },
    [processos, adicionarNotificacao, departamentos]
  );

  const voltarParaDepartamentoAnterior = useCallback(async (processoId: number) => {
    try {
      const processo = processos.find(p => p.id === processoId);
      const confirmado = await mostrarConfirmacao({
        titulo: 'Confirmar retorno',
        mensagem: 'Deseja realmente retornar este processo ao departamento anterior para permitir edições?',
        tipo: 'aviso',
        textoConfirmar: 'Sim, retornar',
        textoCancelar: 'Cancelar',
      });
      if (!confirmado) return;

      await api.voltarProcesso(processoId);
      const processoAtualizado = await api.getProcesso(processoId);
      setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
      adicionarNotificacao('Processo retornado ao departamento anterior', 'sucesso');
      const deptAnterior = departamentos.find(d => d.id === processo?.departamentoAtual);
      const deptRetorno = departamentos.find(d => d.id === processoAtualizado?.departamentoAtual);
      api.registrarLog?.({
        acao: 'VOLTAR', entidade: 'PROCESSO', entidadeId: processoId,
        entidadeNome: processo?.nomeEmpresa || processo?.nome,
        processoId: processoId,
        campo: 'Departamento',
        valorAnterior: deptAnterior?.nome || String(processo?.departamentoAtual ?? ''),
        valorNovo: deptRetorno?.nome || String(processoAtualizado?.departamentoAtual ?? ''),
        detalhes: `Processo retornado de "${deptAnterior?.nome || '?'}" para "${deptRetorno?.nome || '?'}"`,
      });
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao retornar processo', 'erro');
      throw error;
    }
  }, [processos, adicionarNotificacao, mostrarConfirmacao]);

  const adicionarDocumentoProcesso = useCallback(async (processoId: number, arquivo: File, tipo: string, departamentoId?: number, perguntaId?: number, meta?: { visibility?: string; allowedRoles?: string[]; allowedUserIds?: number[] }) => {
    try {
      const processo = processos.find(p => p.id === processoId);
      const novoDocumento = await api.uploadDocumento(
        processoId,
        arquivo,
        tipo,
        perguntaId,
        departamentoId || processo?.departamentoAtual,
        meta
      );
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.debug('adicionarDocumentoProcesso - params', { processoId, departamentoId, perguntaId, meta });
          console.debug('adicionarDocumentoProcesso - novoDocumento', novoDocumento);
          try { console.debug('adicionarDocumentoProcesso - novoDocumento keys', { keys: Object.keys(novoDocumento || {}), perguntaId: novoDocumento?.perguntaId ?? novoDocumento?.pergunta_id, departamentoId: novoDocumento?.departamentoId ?? novoDocumento?.departamento_id, id: novoDocumento?.id }); } catch {}
        } catch {}
      }

      // Aplicar atualização otimista: inserir o novo documento no processo em memória
      setProcessos(prev => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map(p => {
          if (p.id !== processoId) return p;
          const docs = Array.isArray(p.documentos) ? p.documentos.slice() : [];
          // prevenir duplicatas caso o backend já tenha retornado o doc
          const exists = docs.some((d: any) => Number(d.id) === Number(novoDocumento.id));
          if (!exists) docs.push(novoDocumento);
          return { ...p, documentos: docs } as any;
        });
      });

      // Tenta reconciliar com o backend (eventual consistency). Faz algumas tentativas antes de desistir.
      (async () => {
        const maxAttempts = 5;
        const delayMs = 500;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const processoAtualizado = await api.getProcesso(processoId);
            if (processoAtualizado) {
              setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
              if (process.env.NODE_ENV !== 'production') {
                try { console.debug('adicionarDocumentoProcesso - reconciled processo', { processoId, attempt, possuiDocumentos: Array.isArray(processoAtualizado.documentos) ? processoAtualizado.documentos.length : 0 }); } catch {}
              }
              break;
            }
          } catch (e) {
            // ignore and retry
          }
          await new Promise((res) => setTimeout(res, delayMs));
        }
      })();

      adicionarNotificacao('Documento adicionado com sucesso', 'sucesso');

      // Log detalhado de documento
      const deptDoc = departamentos.find(d => d.id === (departamentoId || processo?.departamentoAtual));
      const tamanhoFormatado = arquivo.size > 1024 * 1024 ? `${(arquivo.size / (1024 * 1024)).toFixed(1)} MB` : `${(arquivo.size / 1024).toFixed(0)} KB`;
      api.registrarLog?.({
        acao: 'ANEXAR', entidade: 'PROCESSO', entidadeId: processoId,
        entidadeNome: processo?.nomeEmpresa || processo?.nome,
        processoId: processoId,
        campo: 'Documento',
        valorNovo: arquivo.name,
        detalhes: `Documento "${arquivo.name}" (${tamanhoFormatado}, tipo: ${tipo}) anexado no departamento "${deptDoc?.nome || '?'}"`,
      });

      return novoDocumento;
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao adicionar documento', 'erro');
      throw error;
    }
  }, [processos, adicionarNotificacao, departamentos]);

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
    showLixeira,

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
    setShowLixeira,

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
    carregarEmpresas,
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
    voltarParaDepartamentoAnterior,
    adicionarComentarioProcesso,
    adicionarDocumentoProcesso,
    inicializandoUsuario,
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
