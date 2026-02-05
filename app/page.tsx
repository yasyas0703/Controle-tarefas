'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Building2, AlertCircle, LayoutDashboard, Calendar } from 'lucide-react';
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
import ModalLogin from '@/app/components/modals/ModalLogin';
import ModalCriarDepartamento from '@/app/components/modals/ModalCriarDepartamento';
import ModalNovaEmpresa from '@/app/components/modals/ModalNovaEmpresa';
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

// Tipos de aba
type AbaAtiva = 'dashboard' | 'calendario';

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
    excluirProcesso,
    avancarParaProximoDepartamento,
    voltarParaDepartamentoAnterior,
    finalizarProcesso,
    mostrarAlerta,
    mostrarConfirmacao,
  } = useSistema();

  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroTags, setFiltroTags] = useState<number[]>([]);
  const [filtroDepartamento, setFiltroDepartamento] = useState<number | null>(null);
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [showVisualizacao, setShowVisualizacao] = useState<Processo | null>(null);
  const [showProcessoDetalhado, setShowProcessoDetalhado] = useState<Processo | null>(null);
  const [departamentoEmEdicao, setDepartamentoEmEdicao] = useState<Departamento | null>(null);
  
  // Estado da aba ativa
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('dashboard');

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
      } else {
        // Criar
        const criado = await api.salvarDepartamento(payload);
        setDepartamentos((prev) => [...prev, criado || payload]);
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
        onPersonalizado={() => setShowNovaEmpresa(true)}
        onGerenciarUsuarios={() => setShowGerenciarUsuarios(true)}
        onAnalytics={() => setShowAnalytics(true)}
        onSelecionarTemplate={() => setShowSelecionarTemplate(true)}
        onLogout={() => setUsuarioLogado(null)}
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <DepartamentosGrid
              onCriarDepartamento={() => setShowCriarDepartamento(true)}
              onEditarDepartamento={handleEditarDepartamento}
              onExcluirDepartamento={handleExcluirDepartamento}
              onProcessoClicado={handleProcessoClicado}
              onGaleria={(dept) => setShowGaleria(dept)}
            />
          </div>
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
          onFinalizar={(processo) => finalizarProcesso(processo.id)}
          onExcluir={(processo) => {
            void (async () => {
              const ok = await mostrarConfirmacao({
                titulo: 'Excluir Processo',
                mensagem: 'Tem certeza que deseja excluir este processo?\n\nEssa ação não poderá ser desfeita.',
                tipo: 'perigo',
                textoConfirmar: 'Sim, Excluir',
                textoCancelar: 'Cancelar',
              });

              if (ok) {
                excluirProcesso(processo.id);
              }
            })();
          }}
        />
        </div>
      ) : (
        /* Aba Calendário */
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
          <div className="h-[calc(100vh-180px)]">
            <Calendario />
          </div>
        </div>
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
              finalizarProcesso(showProcessoDetalhado.id);
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
    </div>
  );
}