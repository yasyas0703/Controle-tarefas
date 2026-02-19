'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, Building2, AlertCircle, LayoutDashboard, Calendar, BarChart3, ScrollText, Layers, Briefcase } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { api } from '@/app/utils/api';
import { Processo, Departamento } from '@/app/types';
import Header from '@/app/components/Header';
import DashboardStats from '@/app/components/DashboardStats';
import DepartamentosGrid from '@/app/components/sections/DepartamentosGrid';
import Filtros from '@/app/components/sections/Filtros';
import ListaProcessos from '@/app/components/sections/ListaProcessos';
import SecaoAlertas from '@/app/components/sections/SecaoAlertas';
import ProcessoDetalhado from '@/app/components/ProcessoDetalhado';
import Calendario from '@/app/components/Calendario';
import DashboardGraficos from '@/app/components/DashboardGraficos';
import ModalLogin from '@/app/components/modals/ModalLogin';
import ModalCriarDepartamento from '@/app/components/modals/ModalCriarDepartamento';
import ModalNovaEmpresa from '@/app/components/modals/ModalNovaEmpresa';
import ModalAtividade from '@/app/components/modals/ModalAtividade';
import ModalCadastrarEmpresa from '@/app/components/modals/ModalCadastrarEmpresa';
import ModalGerenciarUsuarios from '@/app/components/modals/ModalGerenciarUsuarios';
import ModalAnalytics from '@/app/components/modals/ModalAnalytics';
import ModalListarEmpresas from '@/app/components/modals/ModalListarEmpresas';
import ModalGerenciarTags from '@/app/components/modals/ModalGerenciarTags';
import ModalComentarios from '@/app/components/modals/ModalComentarios';
import ModalUploadDocumento from '@/app/components/modals/ModalUploadDocumento';
import ModalSelecionarTemplate from '@/app/components/modals/ModalSelecionarTemplate';
import ModalVisualizacao from '@/app/components/modals/ModalVisualizacao';
import GaleriaDocumentos from '@/app/components/modals/ModalGaleria';
import ModalSelecionarTags from '@/app/components/modals/ModalSelecionarTags';
import ModalQuestionarioProcesso from '@/app/components/modals/ModalQuestionarioProcesso';
import ModalConfirmacao from '@/app/components/modals/ModalConfirmacao';
import ModalAlerta from '@/app/components/modals/ModalAlerta';
import ModalEditarQuestionarioSolicitacao from '@/app/components/modals/ModalEditarQuestionarioSolicitacao';
import ModalPreviewDocumento from '@/app/components/modals/ModalPreviewDocumento';
import ModalLixeira from '@/app/components/modals/ModalLixeira';
import ModalMotivoExclusao from '@/app/components/modals/ModalMotivoExclusao';
import ModalInterligar from '@/app/components/modals/ModalInterligar';
import ModalImportarPlanilha from '@/app/components/modals/ModalImportarPlanilha';
import PainelLogs from '@/app/components/PainelLogs';
import SecaoFavoritos from '@/app/components/sections/SecaoFavoritos';
import MeusProcessos from '@/app/components/sections/MeusProcessos';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';

// Tipos de aba
type AbaAtiva = 'dashboard' | 'meus-processos' | 'calendario' | 'graficos' | 'logs' | 'departamentos';

export default function Home() {
  const {
    usuarioLogado,
    inicializandoUsuario,
    setUsuarioLogado,
    processos,
    setProcessos,
    empresas,
    departamentos,
    setDepartamentos,
    showCriarDepartamento,
    setShowCriarDepartamento,
    showNovaEmpresa,
    setShowNovaEmpresa,
    showGerenciarUsuarios,
    setShowGerenciarUsuarios,
    showAnalytics,
    setShowAnalytics,
    showListarEmpresas,
    setShowListarEmpresas,
    showGerenciarTags,
    setShowGerenciarTags,
    showSelecionarTags,
    setShowSelecionarTags,
    showQuestionario,
    setShowQuestionario,
    showQuestionarioSolicitacao,
    setShowQuestionarioSolicitacao,
    showComentarios,
    setShowComentarios,
    showUploadDocumento,
    setShowUploadDocumento,
    showSelecionarTemplate,
    setShowSelecionarTemplate,
    showConfirmacao,
    setShowConfirmacao,
    showAlerta,
    setShowAlerta,
    showCadastrarEmpresa,
    setShowCadastrarEmpresa,
    showGaleria,
    setShowGaleria,
    showPreviewDocumento,
    setShowPreviewDocumento,
    showLixeira,
    setShowLixeira,
    excluirProcesso,
    avancarParaProximoDepartamento,
    voltarParaDepartamentoAnterior,
    finalizarProcesso,
    mostrarAlerta,
    mostrarConfirmacao,
    templates,
    criarProcesso,
  } = useSistema();

  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTags, setFiltroTags] = useState<number[]>([]);
  const [filtroDepartamento, setFiltroDepartamento] = useState<number | null>(null);
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [showVisualizacao, setShowVisualizacao] = useState<Processo | null>(null);
  const [showProcessoDetalhado, setShowProcessoDetalhado] = useState<Processo | null>(null);
  const [departamentoEmEdicao, setDepartamentoEmEdicao] = useState<Departamento | null>(null);
  
  // Estado de favoritos
  const [favoritosIds, setFavoritosIds] = useState<Set<number>>(new Set());
  
  // Estado da aba ativa
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('dashboard');

  // Estado do modal de atividade
  const [showAtividade, setShowAtividade] = useState(false);

  // Estado do modal de importação CSV
  const [showImportarPlanilha, setShowImportarPlanilha] = useState(false);

  // Estado do modal de motivo de exclusão
  const [processoParaExcluir, setProcessoParaExcluir] = useState<Processo | null>(null);

  // Estado do modal de interligar (após finalizar)
  const [interligarInfo, setInterligarInfo] = useState<{ processoId: number; processoNome: string } | null>(null);

  // Estado do modal de edição de template/atividade
  const [templateParaEditar, setTemplateParaEditar] = useState<any>(null);

  // Helper: finalizar processo com prompt de interligação
  const handleFinalizarComInterligar = useCallback(async (processoId: number) => {
    try {
      const result = await finalizarProcesso(processoId);
      if (result && result.finalizado) {
        // Se já tem interligação definida, criar automaticamente a próxima solicitação
        if (result.interligadoComId) {
          const templateOrigem = (templates || []).find(t => t.id === result.interligadoComId);
          if (templateOrigem) {
            // Auto-criar a próxima solicitação usando o template interligado
            // O processo já foi finalizado, então criamos o novo com referência ao anterior
            const processoOrigem = processos.find(p => p.id === processoId);
            if (processoOrigem) {
              try {
                const fluxo = (() => {
                  const v: any = (templateOrigem as any).fluxoDepartamentos ?? (templateOrigem as any).fluxo_departamentos;
                  if (Array.isArray(v)) return v.map(Number);
                  try { const p = JSON.parse(v as any); return Array.isArray(p) ? p.map(Number) : []; } catch { return []; }
                })();
                const qpd = (() => {
                  const v: any = (templateOrigem as any).questionariosPorDepartamento ?? (templateOrigem as any).questionarios_por_departamento;
                  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
                  try { const p = JSON.parse(v as any); return p && typeof p === 'object' ? p : {}; } catch { return {}; }
                })();
                await criarProcesso({
                  nome: templateOrigem.nome,
                  nomeServico: templateOrigem.nome,
                  nomeEmpresa: processoOrigem.nomeEmpresa || processoOrigem.nome,
                  empresa: processoOrigem.nomeEmpresa || processoOrigem.nome,
                  empresaId: (processoOrigem as any).empresaId,
                  fluxoDepartamentos: fluxo,
                  departamentoAtual: fluxo[0],
                  departamentoAtualIndex: 0,
                  questionariosPorDepartamento: qpd as any,
                  personalizado: false,
                  templateId: templateOrigem.id,
                  criadoPor: usuarioLogado?.nome,
                  descricao: `Solicitação interligada (continuação de #${processoId})`,
                  interligadoComId: processoId,
                  interligadoNome: result.processoNome,
                  ...(result.interligadoParalelo ? { deptIndependente: true } : {}),
                } as any);
                void mostrarAlerta?.('Interligação automática', `A solicitação "${templateOrigem.nome}" foi criada automaticamente como continuação.`, 'sucesso');
              } catch (err: any) {
                console.error('Erro ao criar solicitação interligada:', err);
              }
            }
          }
        } else {
          // Não tinha interligação definida → perguntar se quer interligar
          setInterligarInfo({ processoId: result.processoId, processoNome: result.processoNome });
        }
      }
    } catch {
      // Erro já tratado dentro de finalizarProcesso
    }
  }, [finalizarProcesso, templates, processos, criarProcesso, usuarioLogado, mostrarAlerta]);

  // ─── Atalhos de Teclado ⌨️ ────────────────────────────────────
  useKeyboardShortcuts({
    desabilitado: !usuarioLogado,

    // Ctrl+N → Abrir modal de novo processo
    onNovoProcesso: useCallback(() => {
      setShowNovaEmpresa(true);
    }, [setShowNovaEmpresa]),

    // Ctrl+F → Focar no campo de busca
    onBuscar: useCallback(() => {
      // Muda para aba dashboard se não estiver nela
      setAbaAtiva('dashboard');
      // Foca no input de busca (delay curto para garantir renderização)
      setTimeout(() => {
        const input = document.getElementById('busca-processos') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    }, []),

    // Ctrl+S → Salvar / feedback visual (sem ação real global – previne save do navegador)
    onSalvar: useCallback(() => {
      // O Ctrl+S global apenas previne o comportamento padrão do navegador.
      // Em modais com formulários, o save é tratado individualmente.
    }, []),
  });

  // Mantém o modal de visualização completo em sincronia com o estado global.
  // Ex.: se apagar documento na galeria/upload, o modal deve refletir imediatamente.
  useEffect(() => {
    if (!showVisualizacao) return;
    const atualizado = (processos || []).find((p) => Number(p?.id) === Number(showVisualizacao?.id));
    if (!atualizado) return;

    const docsAtualizados = Array.isArray((atualizado as any)?.documentos) ? (atualizado as any).documentos : null;
    if (!docsAtualizados) return;

    const sameDocList = (a: any[], b: any[]) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (Number(a[i]?.id) !== Number(b[i]?.id)) return false;
      }
      return true;
    };

    setShowVisualizacao((prev) => {
      if (!prev || Number(prev?.id) !== Number((atualizado as any)?.id)) return prev;
      const prevDocs = Array.isArray((prev as any)?.documentos) ? (prev as any).documentos : [];
      if (sameDocList(prevDocs, docsAtualizados)) return prev;
      return { ...(prev as any), documentos: docsAtualizados } as any;
    });
  }, [processos, showVisualizacao?.id]);

  // Carregar favoritos quando o usuário está logado
  useEffect(() => {
    const carregarFavoritos = async () => {
      if (!usuarioLogado) {
        setFavoritosIds(new Set());
        return;
      }
      try {
        const favs = await api.getFavoritos();
        // getFavoritos retorna os processos diretamente com o id do processo
        setFavoritosIds(new Set(favs.map((f: any) => f.id)));
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
      }
    };
    carregarFavoritos();
  }, [usuarioLogado]);

  // Função para alternar favorito
  const handleToggleFavorito = async (processoId: number) => {
    try {
      const isFavorito = favoritosIds.has(processoId);
      await api.toggleFavorito(processoId, isFavorito);
      setFavoritosIds(prev => {
        const next = new Set(prev);
        if (isFavorito) {
          next.delete(processoId);
        } else {
          next.add(processoId);
        }
        return next;
      });
    } catch (error) {
      console.error('Erro ao alternar favorito:', error);
    }
  };

  const handleLogin = (usuario: any) => {
    setUsuarioLogado(usuario);
  };

  const handleCriarDepartamento = async (data: any) => {
    try {
      const isUpdate = Boolean(data?.id) && departamentos.some((d) => d.id === data.id);
      const departamentoExistente = isUpdate
        ? departamentos.find((d) => d.id === data.id)
        : undefined;

      const corNormalizada =
        typeof data?.cor === 'string'
          ? data.cor
          : typeof data?.cor?.gradient === 'string'
            ? data.cor.gradient
            : 'from-cyan-500 to-blue-600';

      // Normalizar ícone - sempre deve ser uma string com o nome
      let iconeNormalizado = 'FileText';
      if (typeof data?.icone === 'string') {
        iconeNormalizado = data.icone;
      } else if (data?.icone) {
        // Se for um componente React, tentar extrair o nome
        const iconeName = data.icone.name || data.icone.displayName || 'FileText';
        iconeNormalizado = iconeName;
      }

      // Validar campos obrigatórios
      if (!data.nome || !data.responsavel) {
        await mostrarAlerta('Erro', 'Nome e responsável são obrigatórios', 'erro');
        return;
      }

      const payload = {
        nome: String(data.nome || '').trim(),
        responsavel: String(data.responsavel || '').trim(),
        descricao: data.descricao ? String(data.descricao).trim() : null,
        cor: corNormalizada,
        icone: iconeNormalizado,
        // Importante: ao EDITAR, manter a ordem original caso o modal não envie `ordem`
        ordem:
          data.ordem !== undefined
            ? Number(data.ordem)
            : (departamentoExistente as any)?.ordem ?? departamentos.length,
        ativo: data.ativo !== undefined ? Boolean(data.ativo) : true,
      };

      if (isUpdate) {
        // Atualizar sem reordenar a lista no frontend
        const atualizado = await api.atualizarDepartamento(data.id, payload);
        setDepartamentos((prev) => {
          const idx = prev.findIndex((d) => d.id === data.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...(atualizado || {}), ...payload };
          return next;
        });
        api.registrarLog?.({
          acao: 'EDITAR', entidade: 'DEPARTAMENTO', entidadeId: data.id,
          entidadeNome: payload.nome,
          departamentoId: data.id,
          detalhes: `Departamento editado: "${payload.nome}"`,
        });
      } else {
        // Criar
        const criado = await api.salvarDepartamento(payload);
        setDepartamentos((prev) => [...prev, criado || payload]);
        api.registrarLog?.({
          acao: 'CRIAR', entidade: 'DEPARTAMENTO', entidadeId: criado?.id,
          entidadeNome: payload.nome,
          departamentoId: criado?.id,
          detalhes: `Departamento criado: "${payload.nome}"`,
        });
      }

      setDepartamentoEmEdicao(null);
      setShowCriarDepartamento(false);
    } catch (error: any) {
      await mostrarAlerta('Erro', error.message || 'Erro ao salvar departamento', 'erro');
    }
  };

  const handleEditarDepartamento = (dept: Departamento) => {
    setDepartamentoEmEdicao(dept);
    setShowCriarDepartamento(true);
  };

  const handleExcluirDepartamento = async (dept: Departamento) => {
    const ok = await mostrarConfirmacao({
      titulo: 'Excluir Departamento',
      mensagem: 'Tem certeza que deseja excluir este departamento?\n\nEssa ação não poderá ser desfeita.',
      tipo: 'perigo',
      textoConfirmar: 'Sim, Excluir',
      textoCancelar: 'Cancelar',
    });

    if (ok) {
      try {
        await api.excluirDepartamento(dept.id);
        // Recarregar departamentos
        const departamentosData = await api.getDepartamentos();
        setDepartamentos(departamentosData || []);
        api.registrarLog?.({
          acao: 'EXCLUIR', entidade: 'DEPARTAMENTO', entidadeId: dept.id,
          entidadeNome: dept.nome,
          departamentoId: dept.id,
          detalhes: `Departamento excluído: "${dept.nome}"`,
        });
      } catch (error: any) {
        await mostrarAlerta('Erro', error.message || 'Erro ao excluir departamento', 'erro');
      }
    }
  };

  const handleNovaEmpresa = (data: any) => {
    setProcessos([...processos, data]);
    setShowNovaEmpresa(false);
  };

  const abrirVisualizacaoCompleta = async (processo: Processo) => {
    setProcessoSelecionado(processo);
    try {
      const completo = await api.getProcesso(processo.id);
      setShowVisualizacao(completo);
    } catch {
      setShowVisualizacao(processo);
    }
  };

  const handleProcessoClicado = (processo: Processo) => {
    void abrirVisualizacaoCompleta(processo);
  };

  // Contagem alinhada com o modal: tem CNPJ => "Empresas"; sem CNPJ => "Empresas Novas"
  const empresasCadastradasCount = useMemo(() => {
    const list = Array.isArray(empresas) ? empresas : [];
    return list.filter((e: any) => {
      const cnpj = String(e?.cnpj ?? '').replace(/\D/g, '');
      return cnpj.length > 0;
    }).length;
  }, [empresas]);

  const empresasNovasCount = useMemo(() => {
    const list = Array.isArray(empresas) ? empresas : [];
    return list.filter((e: any) => {
      const cnpj = String(e?.cnpj ?? '').replace(/\D/g, '');
      return cnpj.length === 0;
    }).length;
  }, [empresas]);

  if (inicializandoUsuario) {
    return null; // Ainda estamos tentando restaurar sessão; evita mostrar modal de login momentaneamente
  }

  if (!usuarioLogado) {
    return <ModalLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] transition-colors">
      <Header
        onNovaEmpresa={() => setShowNovaEmpresa(true)}
        onAtividade={() => setShowAtividade(true)}
        onGerenciarUsuarios={() => setShowGerenciarUsuarios(true)}
        onAnalytics={() => setShowAnalytics(true)}
        onSelecionarTemplate={() => setShowSelecionarTemplate(true)}
        onLogout={() => setUsuarioLogado(null)}
        onLogs={() => setAbaAtiva('logs')}
        onImportarPlanilha={() => setShowImportarPlanilha(true)}
      />

      {/* Navegação por Abas */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <nav className="flex gap-1" aria-label="Tabs">
            <button
              onClick={() => setAbaAtiva('dashboard')}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all
                ${abaAtiva === 'dashboard'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Início</span>
            </button>
            <button
              onClick={() => setAbaAtiva('meus-processos')}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all
                ${abaAtiva === 'meus-processos'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <Briefcase size={18} />
              <span className="hidden sm:inline">Meus Processos</span>
              <span className="sm:hidden">📋</span>
            </button>
            <button
              onClick={() => setAbaAtiva('calendario')}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all
                ${abaAtiva === 'calendario'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <Calendar size={18} />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setAbaAtiva('graficos')}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all
                ${abaAtiva === 'graficos'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline">Gráficos</span>
              <span className="sm:hidden">📈</span>
            </button>
            <button
              onClick={() => setAbaAtiva('departamentos')}
              className={`
                flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all
                ${abaAtiva === 'departamentos'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
              `}
            >
              <Layers size={18} />
              <span className="hidden sm:inline">Departamentos</span>
              <span className="sm:hidden">🏢</span>
            </button>
            {/* Aba Logs - apenas admin */}
            {usuarioLogado?.role === 'admin' && (
              <button
                onClick={() => setAbaAtiva('logs')}
                className={`
                  flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-all
                  ${abaAtiva === 'logs'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                `}
              >
                <ScrollText size={18} />
                <span className="hidden sm:inline">Histórico de Logs</span>
                <span className="sm:hidden">📋</span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Conteúdo da Aba */}
      {abaAtiva === 'dashboard' ? (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
          {/* Alertas */}
          <SecaoAlertas />

          {/* Dashboard Stats */}
          <DashboardStats />

        {/* Departamentos */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Fluxo dos Departamentos</h2>
              <p className="text-gray-600">
                {departamentos.length === 0
                  ? 'Crie seus departamentos para começar'
                  : 'Arraste os processos entre os departamentos'}
              </p>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full lg:w-auto lg:justify-end">
              {/* Botão Cadastrar Empresa - apenas admin */}
              {usuarioLogado?.role === 'admin' && (
                <button
                  onClick={() => setShowCadastrarEmpresa(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Plus size={18} />
                  Cadastrar Empresa
                </button>
              )}
              {/* Botões de empresas - todos podem ver */}
              <button
                onClick={() => setShowListarEmpresas('cadastradas')}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-2">
                  <Building2 size={18} />
                  Empresas ({empresasCadastradasCount})
                </span>
              </button>
              <button
                onClick={() => setShowListarEmpresas('nao-cadastradas')}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-2">
                  <AlertCircle size={18} />
                  Empresas Novas ({empresasNovasCount})
                </span>
              </button>
              {/* Botão Criar Departamento - apenas admin */}
              {usuarioLogado?.role === 'admin' && (
                <button
                  onClick={() => setShowCriarDepartamento(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus size={18} />
                    Criar Departamento
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
            <DepartamentosGrid
              onCriarDepartamento={() => setShowCriarDepartamento(true)}
              onEditarDepartamento={handleEditarDepartamento}
              onExcluirDepartamento={handleExcluirDepartamento}
              onProcessoClicado={handleProcessoClicado}
              onGaleria={(dept) => setShowGaleria(dept)}
              favoritosIds={favoritosIds}
              onToggleFavorito={handleToggleFavorito}
              onExcluirProcesso={(processo) => setProcessoParaExcluir(processo)}
              onFinalizarProcesso={handleFinalizarComInterligar}
            />
          </div>
        </div>

        {/* Seção de Favoritos */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 mt-6">
          <SecaoFavoritos 
            onProcessoClicado={handleProcessoClicado}
            favoritosIds={favoritosIds}
            onToggleFavorito={handleToggleFavorito}
          />
        </div>

        {/* Filtros */}
        <Filtros
          onBuscaChange={setFiltroBusca}
          onStatusChange={setFiltroStatus}
          onTagsChange={setFiltroTags}
          onDepartamentoChange={setFiltroDepartamento}
        />

        {/* Lista de Processos */}
        <ListaProcessos
          onProcessoClicado={handleProcessoClicado}
          filtroStatus={filtroStatus}
          filtroBusca={filtroBusca}
          filtroTags={filtroTags}
          filtroDepartamento={filtroDepartamento}
          departamentos={departamentos}
          onComentarios={(processo) => setShowComentarios(processo.id)}
          onQuestionario={(processo, options) =>
            setShowQuestionario({
              processoId: processo.id,
              departamento: processo.departamentoAtual,
              somenteLeitura: Boolean(options?.somenteLeitura) || processo.status === 'finalizado',
            })
          }
          onDocumentos={(processo, options) => {
            if (options?.abrirGaleria) {
              const docs = (processo.documentos || []).length;
              if (docs > 0) {
                const nomeEmpresa = (() => {
                  const nome = (processo as any).nomeEmpresa;
                  if (typeof nome === 'string' && nome.trim()) return nome;

                  const empresa = (processo as any).empresa;
                  if (typeof empresa === 'string' && empresa.trim()) return empresa;
                  if (empresa && typeof empresa === 'object') {
                    return (empresa as any).razao_social || (empresa as any).apelido || (empresa as any).codigo || 'Processo';
                  }

                  return 'Processo';
                })();

                setShowGaleria({ processoId: processo.id, titulo: `Documentos - ${nomeEmpresa}` });
              } else {
                void mostrarAlerta('Sem Documentos', 'Este processo não possui documentos anexados.', 'aviso');
              }
              return;
            }
            setShowUploadDocumento(processo);
          }}
          onTags={(processo) => setShowSelecionarTags(processo)}
          onGerenciarTags={() => setShowGerenciarTags(true)}
          onAvancar={(processo) => avancarParaProximoDepartamento(processo.id)}
          onVoltar={(processo) => voltarParaDepartamentoAnterior(processo.id)}
          onFinalizar={(processo) => handleFinalizarComInterligar(processo.id)}
          onExcluir={(processo) => {
            setProcessoParaExcluir(processo);
          }}
          favoritosIds={favoritosIds}
          onToggleFavorito={handleToggleFavorito}
        />
        </div>
      ) : abaAtiva === 'meus-processos' ? (
        /* Aba Meus Processos */
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <MeusProcessos
            onProcessoClicado={handleProcessoClicado}
            favoritosIds={favoritosIds}
            onToggleFavorito={handleToggleFavorito}
            onExcluirProcesso={(processo) => setProcessoParaExcluir(processo)}
            onFinalizarProcesso={handleFinalizarComInterligar}
          />
        </div>
      ) : abaAtiva === 'calendario' ? (
        /* Aba Calendário */
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <div className="h-[calc(100vh-180px)]">
            <Calendario />
          </div>
        </div>
      ) : abaAtiva === 'logs' ? (
        /* Aba Logs - Histórico Completo */
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <PainelLogs />
        </div>
      ) : abaAtiva === 'departamentos' ? (
        /* Aba Departamentos - Visão por Departamento */
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Layers size={24} className="text-indigo-500" />
            Visão por Departamento
          </h2>
          {departamentos.map((dept: any) => {
            const deptProcessos = (processos || []).filter((p: any) =>
              p.departamentoAtual === dept.id && p.status !== 'finalizado'
            );
            const deptFinalizados = (processos || []).filter((p: any) =>
              (p.fluxoDepartamentos || []).includes(dept.id) && p.status === 'finalizado'
            );
            return (
              <div key={dept.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{dept.nome}</h3>
                    <p className="text-sm text-white/80">{deptProcessos.length} em andamento · {deptFinalizados.length} finalizados</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white font-medium">
                      {deptProcessos.length + deptFinalizados.length} total
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {deptProcessos.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Nenhum processo em andamento neste departamento</p>
                  ) : (
                    <div className="space-y-2">
                      {deptProcessos.slice(0, 10).map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => abrirVisualizacaoCompleta(p)}
                          className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-100 dark:border-gray-700"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {p.nomeEmpresa || p.nome}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                p.prioridade === 'alta' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                p.prioridade === 'media' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {p.prioridade}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">{p.nomeServico || 'Sem serviço'}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>
                      ))}
                      {deptProcessos.length > 10 && (
                        <p className="text-xs text-center text-gray-400">+ {deptProcessos.length - 10} processos</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Aba Gráficos */
        <DashboardGraficos />
      )}

      {/* MODALS */}
      {showCriarDepartamento && (
        <ModalCriarDepartamento
          onClose={() => setShowCriarDepartamento(false)}
          onSave={handleCriarDepartamento}
          departamento={departamentoEmEdicao as any}
        />
      )}

      {showNovaEmpresa && (
        <ModalNovaEmpresa
          onClose={() => setShowNovaEmpresa(false)}
        />
      )}

      {showAtividade && (
        <ModalAtividade
          onClose={() => setShowAtividade(false)}
        />
      )}

      {templateParaEditar && (
        <ModalAtividade
          onClose={() => setTemplateParaEditar(null)}
          templateToEdit={templateParaEditar}
        />
      )}

      {showImportarPlanilha && (
        <ModalImportarPlanilha
          onClose={() => setShowImportarPlanilha(false)}
        />
      )}

      {processoParaExcluir && (
        <ModalMotivoExclusao
          processoNome={processoParaExcluir.nomeEmpresa || processoParaExcluir.nome || `Processo #${processoParaExcluir.id}`}
          onClose={() => setProcessoParaExcluir(null)}
          onConfirmar={async (motivo) => {
            await excluirProcesso(processoParaExcluir.id, motivo);
            setProcessoParaExcluir(null);
          }}
        />
      )}

      {interligarInfo && (
        <ModalInterligar
          processoNome={interligarInfo.processoNome}
          processoId={interligarInfo.processoId}
          templates={(templates || []).map(t => ({ id: t.id, nome: t.nome, descricao: t.descricao }))}
          onClose={() => setInterligarInfo(null)}
          onPular={() => setInterligarInfo(null)}
          onConfirmar={async (templateId, deptIndependente, interligarComId, interligarParalelo) => {
            const template = (templates || []).find(t => t.id === templateId);
            if (!template) return;
            const processoOrigem = processos.find(p => p.id === interligarInfo.processoId);
            try {
              const fluxo = (() => {
                const v: any = (template as any).fluxoDepartamentos ?? (template as any).fluxo_departamentos;
                if (Array.isArray(v)) return v.map(Number);
                try { const p = JSON.parse(v as any); return Array.isArray(p) ? p.map(Number) : []; } catch { return []; }
              })();
              const qpd = (() => {
                const v: any = (template as any).questionariosPorDepartamento ?? (template as any).questionarios_por_departamento;
                if (v && typeof v === 'object' && !Array.isArray(v)) return v;
                try { const p = JSON.parse(v as any); return p && typeof p === 'object' ? p : {}; } catch { return {}; }
              })();
              // Se o usuário escolheu interligar a continuação com outra atividade, usar template ID
              // Caso contrário, apenas referenciar o processo original
              const templateInterligar = interligarComId ? (templates || []).find(t => t.id === interligarComId) : null;
              await criarProcesso({
                nome: template.nome,
                nomeServico: template.nome,
                nomeEmpresa: processoOrigem?.nomeEmpresa || processoOrigem?.nome || 'Empresa',
                empresa: processoOrigem?.nomeEmpresa || processoOrigem?.nome || 'Empresa',
                empresaId: (processoOrigem as any)?.empresaId,
                fluxoDepartamentos: fluxo,
                departamentoAtual: fluxo[0],
                departamentoAtualIndex: 0,
                questionariosPorDepartamento: qpd as any,
                personalizado: false,
                templateId: template.id,
                criadoPor: usuarioLogado?.nome,
                descricao: `Solicitação interligada (continuação de #${interligarInfo.processoId})`,
                ...(interligarComId && templateInterligar ? {
                  interligadoComId: interligarComId,
                  interligadoNome: templateInterligar.nome,
                  interligadoParalelo: !!interligarParalelo,
                } : {}),
                ...(deptIndependente ? { deptIndependente: true } : {}),
              } as any);
              void mostrarAlerta?.('Interligação realizada', `A solicitação "${template.nome}" foi criada como continuação de #${interligarInfo.processoId}.`, 'sucesso');
            } catch (err: any) {
              void mostrarAlerta?.('Erro', err.message || 'Erro ao criar solicitação interligada', 'erro');
            }
            setInterligarInfo(null);
          }}
        />
      )}

      {showCadastrarEmpresa && (
        <ModalCadastrarEmpresa onClose={() => setShowCadastrarEmpresa(false)} />
      )}

      {showGerenciarUsuarios && (
        <ModalGerenciarUsuarios onClose={() => setShowGerenciarUsuarios(false)} />
      )}

      {showAnalytics && <ModalAnalytics onClose={() => setShowAnalytics(false)} />}

      {showListarEmpresas && (
        <ModalListarEmpresas
          onClose={() => setShowListarEmpresas(null)}
          tipo={(typeof showListarEmpresas === 'string' ? showListarEmpresas : showListarEmpresas.tipo) as any}
          empresaIdInicial={
            typeof showListarEmpresas === 'object' && showListarEmpresas
              ? showListarEmpresas.empresaId
              : undefined
          }
        />
      )}

      {showQuestionarioSolicitacao && (
        <ModalEditarQuestionarioSolicitacao
          processoId={showQuestionarioSolicitacao.processoId}
          departamentoId={showQuestionarioSolicitacao.departamentoId}
          onClose={() => setShowQuestionarioSolicitacao(null)}
        />
      )}

      {showGerenciarTags && (
        <ModalGerenciarTags onClose={() => setShowGerenciarTags(false)} />
      )}

      {showComentarios && (
        <ModalComentarios
          processoId={showComentarios}
          processo={processos.find((p) => p.id === showComentarios)}
          onClose={() => setShowComentarios(null)}
        />
      )}

      {showUploadDocumento && (
        <ModalUploadDocumento
          processo={
            typeof showUploadDocumento === 'object' && showUploadDocumento?.id
              ? processos.find((p) => p.id === showUploadDocumento.id)
              : typeof showUploadDocumento === 'object'
                ? showUploadDocumento
                : undefined
          }
          perguntaId={
            typeof showUploadDocumento === 'object' && showUploadDocumento?.perguntaId
              ? showUploadDocumento.perguntaId
              : null
          }
          perguntaLabel={
            typeof showUploadDocumento === 'object' && showUploadDocumento?.perguntaLabel
              ? showUploadDocumento.perguntaLabel
              : null
          }
          departamentoId={
            typeof showUploadDocumento === 'object' && showUploadDocumento?.departamentoId !== undefined
              ? showUploadDocumento.departamentoId
              : null
          }
          onClose={() => setShowUploadDocumento(null)}
        />
      )}

      {showGaleria && (
        <GaleriaDocumentos
          onClose={() => setShowGaleria(null)}
          departamentoId={typeof showGaleria === 'object' ? showGaleria?.id : undefined}
          processoId={typeof showGaleria === 'object' ? showGaleria?.processoId : undefined}
          titulo={typeof showGaleria === 'object' ? showGaleria?.titulo : undefined}
        />
      )}

      {showQuestionario && (
        <ModalQuestionarioProcesso
          processoId={showQuestionario.processoId}
          departamentoId={showQuestionario.departamento}
          somenteLeitura={showQuestionario.somenteLeitura || false}
          allowEditFinalizado={showQuestionario.allowEditFinalizado || false}
          onClose={() => setShowQuestionario(null)}
        />
      )}

      {showSelecionarTags && (
        <ModalSelecionarTags processo={showSelecionarTags} onClose={() => setShowSelecionarTags(null)} />
      )}

      {showSelecionarTemplate && (
        <ModalSelecionarTemplate
          onClose={() => setShowSelecionarTemplate(false)}
          onEditTemplate={(template) => {
            setShowSelecionarTemplate(false);
            setTemplateParaEditar(template);
          }}
        />
      )}

      {showVisualizacao && (
        <ModalVisualizacao
          processo={showVisualizacao}
          onClose={() => setShowVisualizacao(null)}
        />
      )}



      {/* Modal Processo Detalhado */}
      {showProcessoDetalhado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ProcessoDetalhado
            processo={showProcessoDetalhado}
            departamentos={departamentos}
            onClose={() => setShowProcessoDetalhado(null)}
            onVerCompleto={() => {
              void abrirVisualizacaoCompleta(showProcessoDetalhado);
            }}
            onComentarios={() => {
              setShowComentarios(showProcessoDetalhado.id);
            }}
            onQuestionario={() => {
              setShowQuestionario({
                processoId: showProcessoDetalhado.id,
                departamento: showProcessoDetalhado.departamentoAtual,
              });
            }}
            onDocumentos={() => {
              setShowUploadDocumento(showProcessoDetalhado);
            }}
            onAvancar={() => {
              avancarParaProximoDepartamento(showProcessoDetalhado.id);
              setShowProcessoDetalhado(null);
            }}
              onVoltar={() => {
                voltarParaDepartamentoAnterior(showProcessoDetalhado.id);
                setShowProcessoDetalhado(null);
              }}
            onFinalizar={() => {
              handleFinalizarComInterligar(showProcessoDetalhado.id);
              setShowProcessoDetalhado(null);
            }}
          />
        </div>
      )}

      {showConfirmacao && (
        <ModalConfirmacao
          titulo={showConfirmacao.titulo}
          mensagem={showConfirmacao.mensagem}
          tipo={showConfirmacao.tipo}
          textoConfirmar={showConfirmacao.textoConfirmar}
          textoCancelar={showConfirmacao.textoCancelar}
          onConfirm={() => {
            showConfirmacao.onConfirm?.();
            setShowConfirmacao(null);
          }}
          onCancel={() => {
            showConfirmacao.onCancel?.();
            setShowConfirmacao(null);
          }}
        />
      )}

      {showAlerta && (
        <ModalAlerta
          titulo={showAlerta.titulo}
          mensagem={showAlerta.mensagem}
          tipo={showAlerta.tipo}
          onClose={() => {
            showAlerta.onClose?.();
            setShowAlerta(null);
          }}
        />
      )}
      {showPreviewDocumento && (
        <ModalPreviewDocumento
          documento={showPreviewDocumento}
          onClose={() => setShowPreviewDocumento(null)}
        />
      )}

      {showLixeira && (
        <ModalLixeira
          isOpen={showLixeira}
          onClose={() => setShowLixeira(false)}
        />
      )}

    </div>
  );
}