'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ScrollText, Search, Filter, Clock, User, Building, FileText,
  ChevronDown, ChevronUp, RefreshCw, Download, AlertTriangle,
  Edit, Trash2, Plus, ArrowRight, ArrowLeft, CheckCircle,
  MessageSquare, Tag, Link2, Upload, LogIn, LogOut, Loader2,
  CheckSquare, Square, XCircle,
} from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import type { LogAuditoria, TipoAcaoLog } from '@/app/types';
import { api } from '@/app/utils/api';

const ACOES_CONFIG: Record<TipoAcaoLog, { label: string; cor: string; icone: any }> = {
  CRIAR: { label: 'Criou', cor: 'bg-green-100 text-green-700', icone: Plus },
  EDITAR: { label: 'Editou', cor: 'bg-blue-100 text-blue-700', icone: Edit },
  EXCLUIR: { label: 'Excluiu', cor: 'bg-red-100 text-red-700', icone: Trash2 },
  VISUALIZAR: { label: 'Visualizou', cor: 'bg-gray-100 text-gray-600', icone: FileText },
  AVANCAR: { label: 'Avançou', cor: 'bg-cyan-100 text-cyan-700', icone: ArrowRight },
  VOLTAR: { label: 'Voltou', cor: 'bg-amber-100 text-amber-700', icone: ArrowLeft },
  FINALIZAR: { label: 'Finalizou', cor: 'bg-emerald-100 text-emerald-700', icone: CheckCircle },
  PREENCHER: { label: 'Preencheu', cor: 'bg-purple-100 text-purple-700', icone: Edit },
  COMENTAR: { label: 'Comentou', cor: 'bg-indigo-100 text-indigo-700', icone: MessageSquare },
  ANEXAR: { label: 'Anexou', cor: 'bg-teal-100 text-teal-700', icone: Upload },
  TAG: { label: 'Tag', cor: 'bg-pink-100 text-pink-700', icone: Tag },
  TRANSFERIR: { label: 'Transferiu', cor: 'bg-orange-100 text-orange-700', icone: ArrowRight },
  INTERLIGAR: { label: 'Interligou', cor: 'bg-violet-100 text-violet-700', icone: Link2 },
  CHECK: { label: 'Check', cor: 'bg-lime-100 text-lime-700', icone: CheckCircle },
  LOGIN: { label: 'Login', cor: 'bg-sky-100 text-sky-700', icone: LogIn },
  LOGOUT: { label: 'Logout', cor: 'bg-slate-100 text-slate-600', icone: LogOut },
  IMPORTAR: { label: 'Importou', cor: 'bg-fuchsia-100 text-fuchsia-700', icone: Upload },
};

type FiltroEntidade = 'todos' | 'PROCESSO' | 'EMPRESA' | 'DEPARTAMENTO' | 'USUARIO' | 'TEMPLATE' | 'COMENTARIO' | 'DOCUMENTO' | 'TAG';

export default function PainelLogs() {
  const { usuarioLogado, mostrarAlerta, mostrarConfirmacao } = useSistema();
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroAcao, setFiltroAcao] = useState<string>('todos');
  const [filtroEntidade, setFiltroEntidade] = useState<FiltroEntidade>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [expandido, setExpandido] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);
  const POR_PAGINA = 50;

  const carregarLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getLogs?.();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioLogado?.role === 'admin') {
      carregarLogs();
    }
  }, [usuarioLogado]);

  const logsFiltrados = useMemo(() => {
    let filtered = [...logs];

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.entidadeNome?.toLowerCase().includes(termo) ||
          l.detalhes?.toLowerCase().includes(termo) ||
          l.campo?.toLowerCase().includes(termo) ||
          l.valorNovo?.toLowerCase().includes(termo) ||
          l.valorAnterior?.toLowerCase().includes(termo) ||
          l.usuario?.nome?.toLowerCase().includes(termo)
      );
    }

    if (filtroAcao !== 'todos') {
      filtered = filtered.filter((l) => l.acao === filtroAcao);
    }

    if (filtroEntidade !== 'todos') {
      filtered = filtered.filter((l) => l.entidade === filtroEntidade);
    }

    if (filtroPeriodo !== 'todos') {
      const agora = new Date();
      let desde: Date;
      switch (filtroPeriodo) {
        case 'hoje': desde = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()); break;
        case '7d': desde = new Date(agora.getTime() - 7 * 86400000); break;
        case '30d': desde = new Date(agora.getTime() - 30 * 86400000); break;
        default: desde = new Date(0);
      }
      filtered = filtered.filter((l) => new Date(l.criadoEm) >= desde);
    }

    return filtered.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }, [logs, busca, filtroAcao, filtroEntidade, filtroPeriodo]);

  const logsPaginados = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return logsFiltrados.slice(inicio, inicio + POR_PAGINA);
  }, [logsFiltrados, pagina]);

  const totalPaginas = Math.ceil(logsFiltrados.length / POR_PAGINA);

  const formatarData = (data: Date | string) => {
    const d = new Date(data);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // ─── Seleção ─────────────────────────────────────────────
  const toggleSelecionado = useCallback((id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selecionarTodosPagina = useCallback(() => {
    setSelecionados(prev => {
      const next = new Set(prev);
      const todosNaPagina = logsPaginados.map(l => l.id);
      const todosSelecionados = todosNaPagina.every(id => next.has(id));
      if (todosSelecionados) {
        todosNaPagina.forEach(id => next.delete(id));
      } else {
        todosNaPagina.forEach(id => next.add(id));
      }
      return next;
    });
  }, [logsPaginados]);

  const selecionarTodosFiltrados = useCallback(() => {
    setSelecionados(prev => {
      const ids = logsFiltrados.map(l => l.id);
      const todosSelecionados = ids.every(id => prev.has(id));
      if (todosSelecionados) {
        return new Set();
      }
      return new Set(ids);
    });
  }, [logsFiltrados]);

  const limparSelecao = useCallback(() => {
    setSelecionados(new Set());
    setModoSelecao(false);
  }, []);

  const todosPaginaSelecionados = useMemo(() => {
    if (logsPaginados.length === 0) return false;
    return logsPaginados.every(l => selecionados.has(l.id));
  }, [logsPaginados, selecionados]);

  // ─── Exclusão ────────────────────────────────────────────
  const excluirSelecionados = async () => {
    if (selecionados.size === 0) return;

    const confirmou = await mostrarConfirmacao({
      titulo: 'Excluir Logs Selecionados',
      mensagem: `Tem certeza que deseja excluir ${selecionados.size} log(s) selecionado(s)?\n\nEsta ação não pode ser desfeita.`,
      tipo: 'perigo',
      textoConfirmar: 'Sim, Excluir',
      textoCancelar: 'Cancelar',
    });

    if (!confirmou) return;

    setExcluindo(true);
    try {
      const result = await api.deleteLogs?.({ ids: Array.from(selecionados) });
      void mostrarAlerta?.('Logs Excluídos', `${result?.deletados || selecionados.size} log(s) excluído(s) com sucesso.`, 'sucesso');
      setSelecionados(new Set());
      setModoSelecao(false);
      await carregarLogs();
    } catch (err: any) {
      void mostrarAlerta?.('Erro', err.message || 'Erro ao excluir logs', 'erro');
    } finally {
      setExcluindo(false);
    }
  };

  const excluirTodos = async () => {
    const confirmou = await mostrarConfirmacao({
      titulo: 'Limpar Todo o Histórico',
      mensagem: `ATENÇÃO: Isso irá EXCLUIR PERMANENTEMENTE todos os ${logs.length} registros de log do sistema.\n\nEsta ação NÃO pode ser desfeita. Recomendamos exportar um backup antes de continuar.\n\nDeseja prosseguir?`,
      tipo: 'perigo',
      textoConfirmar: 'Sim, Limpar Tudo',
      textoCancelar: 'Cancelar',
    });

    if (!confirmou) return;

    setExcluindo(true);
    try {
      const result = await api.deleteLogs?.({ todos: true });
      void mostrarAlerta?.('Histórico Limpo', `${result?.deletados || 0} log(s) excluído(s) com sucesso.`, 'sucesso');
      setSelecionados(new Set());
      setModoSelecao(false);
      await carregarLogs();
    } catch (err: any) {
      void mostrarAlerta?.('Erro', err.message || 'Erro ao limpar logs', 'erro');
    } finally {
      setExcluindo(false);
    }
  };

  if (usuarioLogado?.role !== 'admin') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900">Acesso Restrito</h3>
        <p className="text-gray-600 mt-2">Apenas administradores podem ver o histórico de logs.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[var(--card)] rounded-2xl shadow-xl border border-gray-100 dark:border-[var(--border)] p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[var(--fg)] flex items-center gap-2">
            <ScrollText size={24} /> Histórico de Logs
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Registro detalhado de todas as ações do sistema ({logsFiltrados.length} registros)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Botão Selecionar */}
          <button
            onClick={() => {
              if (modoSelecao) { limparSelecao(); } else { setModoSelecao(true); }
            }}
            className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition text-sm ${
              modoSelecao
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {modoSelecao ? <XCircle size={16} /> : <CheckSquare size={16} />}
            {modoSelecao ? 'Cancelar' : 'Selecionar'}
          </button>
          {/* Excluir selecionados */}
          {modoSelecao && selecionados.size > 0 && (
            <button
              onClick={excluirSelecionados}
              disabled={excluindo}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 transition text-sm disabled:opacity-50"
            >
              {excluindo ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Excluir ({selecionados.size})
            </button>
          )}
          {/* Limpar todos */}
          {logs.length > 0 && (
            <button
              onClick={excluirTodos}
              disabled={excluindo}
              className="px-4 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium text-gray-600 flex items-center gap-2 transition text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Limpar Tudo
            </button>
          )}
          <button
            onClick={carregarLogs}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 flex items-center gap-2 transition text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Atualizar
          </button>
        </div>
      </div>

      {/* Barra de seleção em lote */}
      {modoSelecao && logsFiltrados.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
          <button
            onClick={selecionarTodosPagina}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {todosPaginaSelecionados ? 'Desmarcar página' : 'Selecionar página'}
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={selecionarTodosFiltrados}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Selecionar todos os {logsFiltrados.length} filtrados
          </button>
          {selecionados.size > 0 && (
            <>
              <span className="text-gray-400">|</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {selecionados.size} selecionado(s)
              </span>
            </>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nos logs..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <select
          value={filtroAcao}
          onChange={(e) => { setFiltroAcao(e.target.value); setPagina(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="todos">Todas as ações</option>
          {Object.entries(ACOES_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={filtroEntidade}
          onChange={(e) => { setFiltroEntidade(e.target.value as FiltroEntidade); setPagina(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="todos">Todas as entidades</option>
          <option value="PROCESSO">Processos</option>
          <option value="EMPRESA">Empresas</option>
          <option value="DEPARTAMENTO">Departamentos</option>
          <option value="USUARIO">Usuários</option>
          <option value="TEMPLATE">Templates</option>
          <option value="COMENTARIO">Comentários</option>
          <option value="DOCUMENTO">Documentos</option>
          <option value="TAG">Tags</option>
        </select>

        <select
          value={filtroPeriodo}
          onChange={(e) => { setFiltroPeriodo(e.target.value); setPagina(1); }}
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="todos">Todo o período</option>
          <option value="hoje">Hoje</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
        </select>
      </div>

      {/* Lista de Logs */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin mx-auto text-indigo-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando logs...</p>
        </div>
      ) : logsFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <ScrollText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Nenhum log encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logsPaginados.map((log) => {
            const config = ACOES_CONFIG[log.acao] || ACOES_CONFIG.EDITAR;
            const Icone = config.icone;
            const isExpanded = expandido === log.id;
            const isSelecionado = selecionados.has(log.id);

            return (
              <div
                key={log.id}
                className={`border rounded-xl transition-all ${
                  isSelecionado
                    ? 'border-red-300 dark:border-red-600 bg-red-50/30 dark:bg-red-900/10'
                    : isExpanded
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-1">
                  {/* Checkbox */}
                  {modoSelecao && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelecionado(log.id); }}
                      className="pl-3 pr-1 py-3 shrink-0"
                    >
                      {isSelecionado ? (
                        <CheckSquare size={18} className="text-red-500" />
                      ) : (
                        <Square size={18} className="text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setExpandido(isExpanded ? null : log.id)}
                    className={`flex-1 flex items-center gap-3 p-3 text-left ${!modoSelecao ? '' : 'pl-1'}`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${config.cor}`}>
                      <Icone size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {log.usuario?.nome || 'Sistema'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.cor}`}>
                          {config.label}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {log.entidade?.toLowerCase()} {log.entidadeNome && <span className="font-medium">&ldquo;{log.entidadeNome}&rdquo;</span>}
                        </span>
                        {log.campo && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {log.campo}
                          </span>
                        )}
                      </div>
                      {/* Mostrar resumo da alteração inline (antes → depois) */}
                      {(log.valorAnterior || log.valorNovo) && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs flex-wrap">
                          {log.valorAnterior && (
                            <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded line-through max-w-[200px] truncate" title={log.valorAnterior}>
                              {log.valorAnterior}
                            </span>
                          )}
                          {log.valorAnterior && log.valorNovo && (
                            <ArrowRight size={10} className="text-gray-400 shrink-0" />
                          )}
                          {log.valorNovo && (
                            <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-medium max-w-[200px] truncate" title={log.valorNovo}>
                              {log.valorNovo}
                            </span>
                          )}
                        </div>
                      )}
                      {!log.valorAnterior && !log.valorNovo && log.detalhes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[600px]">
                          {log.detalhes}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                      <Clock size={12} />
                      {formatarData(log.criadoEm)}
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 mt-1 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Usuário:</span>{' '}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{log.usuario?.nome} ({log.usuario?.email})</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Data/Hora:</span>{' '}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatarData(log.criadoEm)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Entidade:</span>{' '}
                        <span className="font-medium text-gray-900 dark:text-gray-100">{log.entidade} #{log.entidadeId}</span>
                      </div>
                      {log.processoId && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Processo ID:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">#{log.processoId}</span>
                        </div>
                      )}
                      {log.empresaId && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Empresa ID:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">#{log.empresaId}</span>
                        </div>
                      )}
                    </div>
                    {(log.valorAnterior || log.valorNovo) && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1">
                          <Edit size={12} /> Alteração{log.campo ? ` no campo: ${log.campo}` : ''}
                        </div>
                        <div className="space-y-1.5">
                          {log.valorAnterior && (
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-red-500 font-semibold shrink-0 w-14">Antes:</span>
                              <span className="text-gray-700 dark:text-gray-200 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-200 dark:border-red-800 break-all">{log.valorAnterior}</span>
                            </div>
                          )}
                          {log.valorNovo && (
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-green-500 font-semibold shrink-0 w-14">Depois:</span>
                              <span className="text-gray-700 dark:text-gray-200 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-200 dark:border-green-800 break-all">{log.valorNovo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {log.detalhes && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Detalhes completos</div>
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{log.detalhes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Página {pagina} de {totalPaginas} ({logsFiltrados.length} registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina(Math.max(1, pagina - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
