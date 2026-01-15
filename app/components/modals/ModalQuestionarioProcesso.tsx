'use client';

import React from 'react';
import { X, Save, Upload, FileText, Eye, Download, MessageSquare, CheckCircle, Pencil } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import LoadingOverlay from '../LoadingOverlay';
import { Questionario } from '@/app/types';
import { formatarDataHora, formatarTamanhoParcela } from '@/app/utils/helpers';

interface ModalQuestionarioProcessoProps {
  processoId: number;
  departamentoId: number;
  somenteLeitura?: boolean;
  onClose: () => void;
}

export default function ModalQuestionarioProcesso({
  processoId,
  departamentoId,
  somenteLeitura = false,
  onClose,
}: ModalQuestionarioProcessoProps) {
  const {
    processos,
    setProcessos,
    departamentos,
    empresas,
    usuarioLogado,
    atualizarProcesso,
    setShowUploadDocumento,
    adicionarNotificacao,
    mostrarAlerta,
    mostrarConfirmacao,
    setShowListarEmpresas,
    setShowQuestionarioSolicitacao,
    setShowPreviewDocumento,
  } = useSistema();

  const processo = processos.find((p) => p.id === processoId);
  const departamento = departamentos.find((d) => d.id === departamentoId);

  const getDepartamentoIcone = (icone: any) => {
    if (typeof icone === 'function') return icone;
    if (typeof icone === 'string' && icone) {
      return (LucideIcons as any)[icone] || null;
    }
    return null;
  };

  const [carregandoProcesso, setCarregandoProcesso] = React.useState(false);
  const [salvandoRespostas, setSalvandoRespostas] = React.useState(false);

  const modalContainerRef = React.useRef<HTMLDivElement | null>(null);

  // DEBUG: log dos parâmetros e questionário (apenas em dev)
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('DEBUG ModalQuestionarioProcesso - params', { processoId, departamentoId });
      console.debug('DEBUG ModalQuestionarioProcesso - processo summary', {
        id: processo?.id,
        nomeEmpresa: processo?.nomeEmpresa,
        status: processo?.status,
        questionariosKeys: processo ? Object.keys((processo as any).questionariosPorDepartamento || {}) : undefined,
        questionariosLength: Array.isArray((processo as any)?.questionarios) ? (processo as any).questionarios.length : 0,
        comentariosLength: Array.isArray((processo as any)?.comentarios) ? (processo as any).comentarios.length : 0,
        documentosLength: Array.isArray((processo as any)?.documentos) ? (processo as any).documentos.length : 0,
      });
    }
  } catch {
    // noop
  }
  // Priorizar questionariosPorDepartamento corretamente
  let questionarioAtual: Questionario[] = [];
  if (processo?.questionariosPorDepartamento && processo.questionariosPorDepartamento[String(departamentoId)]) {
    questionarioAtual = processo.questionariosPorDepartamento[String(departamentoId)];
  } else if (processo?.questionariosPorDepartamento && processo.questionariosPorDepartamento[departamentoId]) {
    questionarioAtual = processo.questionariosPorDepartamento[departamentoId];
  } else if ((processo as any)?.questionarioSolicitacao) {
    questionarioAtual = (processo as any).questionarioSolicitacao;
  } else if ((processo as any)?.questionario) {
    questionarioAtual = (processo as any).questionario;
  } else if ((processo as any)?.questionarios) {
    questionarioAtual = (processo as any).questionarios;
  }
  console.log('DEBUG questionarioAtual', questionarioAtual);

  // Exibir loading enquanto carrega o processo detalhado e não há questionário
  const showLoading = carregandoProcesso && questionarioAtual.length === 0;
  console.log('DEBUG questionarioAtual', questionarioAtual);

  React.useEffect(() => {
    let cancelled = false;

    const needsFetch = (() => {
      if (!processoId || !departamentoId) return false;
      // Se não temos o processo no estado, sempre busca.
      if (!processo) return true;
      // Se o processo veio do GET /processos (lista), ele normalmente não inclui questionários.
      // Busca o detalhe para carregar as perguntas.
      const hasAnyQuestionario =
        Array.isArray((processo as any)?.questionarios) && (processo as any).questionarios.length > 0;
      return !hasAnyQuestionario;
    })();

    if (!needsFetch) return;

    void (async () => {
      try {
        setCarregandoProcesso(true);
        const { api } = await import('@/app/utils/api');
        const atualizado = await api.getProcesso(processoId);
        if (process.env.NODE_ENV !== 'production') {
          try {
            console.debug('DEBUG ModalQuestionarioProcesso - fetched processo', {
              id: atualizado?.id,
              questionariosLength: Array.isArray((atualizado as any)?.questionarios) ? (atualizado as any).questionarios.length : 0,
              questionariosPorDepartamentoKeys: atualizado ? Object.keys((atualizado as any).questionariosPorDepartamento || {}) : [],
              respostasHistoricoKeys: atualizado ? Object.keys((atualizado as any).respostasHistorico || {}) : [],
            });
          } catch {
            // ignore
          }
        }
        if (cancelled) return;

        setProcessos((prev: any) => {
          const list = Array.isArray(prev) ? prev : [];
          const idx = list.findIndex((p: any) => p?.id === processoId);
          if (idx >= 0) {
            return list.map((p: any) => (p?.id === processoId ? atualizado : p));
          }
          return [...list, atualizado];
        });
      } catch (e) {
        // Se falhar, o modal ainda renderiza o estado atual.
        console.warn('Falha ao carregar processo completo:', e);
      } finally {
        if (!cancelled) setCarregandoProcesso(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processoId, departamentoId]);

  const respostasSalvas =
    ((processo?.respostasHistorico as any)?.[departamentoId]?.respostas as Record<string, any>) || {};

  const [respostas, setRespostas] = React.useState<Record<string, any>>(respostasSalvas);
  const respostasBackupRef = React.useRef<Record<string, any>>(respostasSalvas);

  React.useEffect(() => {
    setRespostas(respostasSalvas);
    respostasBackupRef.current = JSON.parse(JSON.stringify(respostasSalvas || {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processoId, departamentoId]);

  const keyOf = (pergunta: Questionario) => String(pergunta.id);
  const safeValue = (val: any) => (val === undefined || val === null ? '' : val);

  const temMudancasNaoSalvas = () => {
    try {
      return JSON.stringify(respostas || {}) !== JSON.stringify(respostasBackupRef.current || {});
    } catch {
      return false;
    }
  };

  const handleRespostaChange = (perguntaId: number, valor: any) => {
    setRespostas((prev) => ({
      ...prev,
      [String(perguntaId)]: valor,
    }));
  };

  const docsAnexadosPergunta = (perguntaId: number) => {
    const docs = processo?.documentos || [];
    return docs.filter((d: any) => Number(d.perguntaId) === Number(perguntaId));
  };

  const docsAnexadosPerguntaNoDepartamento = (deptId: number, perguntaId: number) => {
    const docs = processo?.documentos || [];
    return docs.filter((d: any) => {
      const dPerg = Number(d?.perguntaId ?? d?.pergunta_id);
      if (dPerg !== Number(perguntaId)) return false;

      const dDeptRaw = d?.departamentoId ?? d?.departamento_id;
      const dDept = Number(dDeptRaw);
      // Alguns registros antigos podem não ter departamentoId; ainda assim pertence ao processo/pergunta
      if (!Number.isFinite(dDept)) return true;
      return dDept === Number(deptId);
    });
  };

  const avaliarCondicao = (pergunta: Questionario, respostasAtuais: Record<string, any>) => {
    if (!pergunta.condicao) return true;
    const { perguntaId, operador, valor } = pergunta.condicao;
    const respostaCondicional = respostasAtuais[String(perguntaId)];
    if (respostaCondicional === undefined || respostaCondicional === null || respostaCondicional === '') {
      return false;
    }
    const r = String(respostaCondicional).trim().toLowerCase();
    const v = String(valor).trim().toLowerCase();
    switch (operador) {
      case 'igual':
        return r === v;
      case 'diferente':
        return r !== v;
      case 'contem':
        return r.includes(v);
      default:
        return true;
    }
  };

  const validarObrigatorios = () => {
    const obrigatorias = (questionarioAtual || []).filter((p) => p.obrigatorio);

    const faltando = obrigatorias.filter((p) => {
      if (!avaliarCondicao(p, respostas)) return false;
      if (p.tipo === 'file') {
        return docsAnexadosPergunta(p.id).length === 0;
      }
      const r = respostas[keyOf(p)];
      if (r === null || r === undefined) return true;
      if (typeof r === 'string' && !r.trim()) return true;
      return false;
    });

    if (faltando.length > 0) {
      const nomes = faltando.map((p) => p.label).join(', ');
      void mostrarAlerta('Campos obrigatórios', `Preencha os campos obrigatórios: ${nomes}`, 'aviso');
      return false;
    }

    return true;
  };

  const removerDocumento = (documentoId: number) => {
    if (!processo) return;
    void (async () => {
      const ok = await mostrarConfirmacao({
        titulo: 'Excluir Documento',
        mensagem: 'Tem certeza que deseja excluir este documento?\n\nEsta ação não poderá ser desfeita.',
        tipo: 'perigo',
        textoConfirmar: 'Sim, Excluir',
        textoCancelar: 'Cancelar',
      });

      if (!ok) return;

      atualizarProcesso(processoId, {
        documentos: (processo.documentos || []).filter((d: any) => d.id !== documentoId),
      } as any);
    })();
  };

  const baixarDocumento = (doc: any) => {
    try {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      adicionarNotificacao('Erro ao baixar arquivo', 'erro');
    }
  };

  const visualizarDocumento = (doc: any) => {
    try {
      setShowPreviewDocumento(doc);
    } catch {
      // noop
    }
  };

  const handleSalvar = async () => {
    if (!processo || !departamento) return;
    if (somenteLeitura || processo.status === 'finalizado') return;
    if (!validarObrigatorios()) return;

    try {
      setSalvandoRespostas(true);
      // Salvar respostas usando a API de questionários
      const { api } = await import('@/app/utils/api');
      await api.salvarRespostasQuestionario(processoId, departamentoId, respostas);

      // Recarregar o processo atualizado
      const processoAtualizado = await api.getProcesso(processoId);
      if (processoAtualizado && setProcessos) {
        setProcessos((prev: any) => prev.map((p: any) => p.id === processoId ? processoAtualizado : p));
      }

      respostasBackupRef.current = JSON.parse(JSON.stringify(respostas || {}));
      adicionarNotificacao('✅ Respostas salvas com sucesso!', 'sucesso');
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar respostas:', error);
      adicionarNotificacao(error.message || 'Erro ao salvar respostas', 'erro');
    } finally {
      setSalvandoRespostas(false);
    }
  };

  const handleFecharModal = () => {
    void (async () => {
      if (!somenteLeitura && processo?.status !== 'finalizado' && temMudancasNaoSalvas()) {
        const confirmouSalvar = await mostrarConfirmacao({
          titulo: 'Alterações não salvas',
          mensagem: 'Você tem alterações não salvas. Deseja salvar antes de fechar?',
          tipo: 'aviso',
          textoConfirmar: 'Salvar',
          textoCancelar: 'Descartar',
        });

        if (confirmouSalvar) {
          handleSalvar();
          return;
        }
        setRespostas({ ...(respostasBackupRef.current || {}) });
      }

      onClose();
    })();
  };

  const renderCampo = (pergunta: Questionario) => {
    const bloqueado = somenteLeitura || processo?.status === 'finalizado';
    const k = keyOf(pergunta);
    const valor = respostas[k];
    const isEmpty = valor === undefined || valor === null || valor === '';

    switch (pergunta.tipo) {
      case 'text':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
            {isEmpty ? '—' : String(valor)}
          </div>
        ) : (
          <input
            type="text"
            value={safeValue(valor)}
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value.slice(0, 200))}
            maxLength={200}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
            required={pergunta.obrigatorio}
            placeholder="Digite sua resposta (máx. 200 caracteres)"
          />
        );

      case 'textarea':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 whitespace-pre-wrap">
            {isEmpty ? '—' : String(valor).trim()}
          </div>
        ) : (
          <textarea
            value={safeValue(valor)}
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value.slice(0, 500))}
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 resize-vertical"
            required={pergunta.obrigatorio}
            placeholder="Digite sua resposta (máx. 500 caracteres)"
          />
        );

      case 'number':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
            {isEmpty ? '—' : String(valor)}
          </div>
        ) : (
          <input
            type="number"
            value={safeValue(valor)}
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
            required={pergunta.obrigatorio}
            placeholder="Digite um número"
          />
        );

      case 'date':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
            {isEmpty ? '—' : new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' } as any)}
          </div>
        ) : (
          <input
            type="date"
            value={safeValue(valor)}
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
            required={pergunta.obrigatorio}
          />
        );

      case 'email':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
            {isEmpty ? '—' : String(valor)}
          </div>
        ) : (
          <input
            type="email"
            value={safeValue(valor)}
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
            required={pergunta.obrigatorio}
            placeholder="exemplo@email.com"
          />
        );

      case 'phone':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
            {isEmpty ? '—' : String(valor)}
          </div>
        ) : (
          <input
            type="tel"
            value={safeValue(valor)}
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
            required={pergunta.obrigatorio}
            placeholder="(00) 00000-0000"
          />
        );

      case 'file': {
        const docsAnexados = docsAnexadosPergunta(pergunta.id);
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                <FileText size={16} className="text-blue-500" />
                Documentos Anexados ({docsAnexados.length})
              </h5>

              {docsAnexados.length === 0 ? (
                <div className="bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-[var(--border)] rounded-xl p-5 text-center">
                  <FileText size={26} className="mx-auto text-blue-300 mb-2" />
                  <p className="text-sm text-blue-700 dark:text-[var(--fg)]">Nenhum documento anexado ainda</p>
                  {!bloqueado && (
                    <p className="text-xs text-blue-500 dark:text-gray-400 mt-1">
                      Clique em &quot;Anexar Arquivo&quot; para enviar documentos
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {docsAnexados.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-[var(--border)] rounded-xl p-3 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="text-blue-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-semibold text-gray-900 dark:text-[var(--fg)] truncate"
                              title={doc.nome}
                            >
                              {doc.nome}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-blue-500 mt-1">
                              <span>{formatarTamanhoParcela(Number(doc.tamanho || 0))}</span>
                              <span>{formatarDataHora(doc.dataUpload)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0 ml-3">
                          <button
                            type="button"
                            onClick={() => visualizarDocumento(doc)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Visualizar documento"
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => baixarDocumento(doc)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Baixar documento"
                          >
                            <Download size={16} />
                          </button>

                          {!bloqueado && (
                            <button
                              type="button"
                              onClick={() => removerDocumento(doc.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                              title="Excluir documento"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!bloqueado && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowUploadDocumento({
                    id: processoId,
                    perguntaId: pergunta.id,
                    perguntaLabel: pergunta.label,
                  });
                }}
                className="w-full px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Upload size={18} />
                <span>{docsAnexados.length > 0 ? 'Adicionar Mais Arquivos' : 'Anexar Arquivo'}</span>
              </button>
            )}

            <input type="hidden" name={`pergunta_${pergunta.id}`} value={safeValue(respostas[k])} />
          </div>
        );
      }

      case 'boolean':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
            {isEmpty ? '—' : String(valor)}
          </div>
        ) : (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={String(pergunta.id)}
                value="Sim"
                checked={respostas[k] === 'Sim'}
                onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
                className="w-5 h-5 text-cyan-600"
                required={pergunta.obrigatorio}
              />
              <span className="text-gray-700">Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={String(pergunta.id)}
                value="Não"
                checked={respostas[k] === 'Não'}
                onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
                className="w-5 h-5 text-cyan-600"
                required={pergunta.obrigatorio}
              />
              <span className="text-gray-700">Não</span>
            </label>
          </div>
        );

      case 'select':
        return bloqueado ? (
          <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
            {isEmpty ? '—' : String(valor)}
          </div>
        ) : (
          <select
            value={safeValue(valor)}
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
            required={pergunta.obrigatorio}
          >
            <option value="">Selecione...</option>
            {(pergunta.opcoes || []).filter((o) => String(o).trim()).map((op, idx) => (
              <option key={idx} value={op}>
                {op}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  if (!processo || !departamento) {
    return null;
  }

  const respostasAnteriores: Array<{ deptId: number; dados: any }> = [];
  try {
    const fluxoIds: number[] = Array.isArray((processo as any)?.fluxoDepartamentos)
      ? ((processo as any).fluxoDepartamentos as any[]).map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x))
      : [];

    const idxNoFluxo = fluxoIds.findIndex((id) => id === Number(departamentoId));
    const deptIdsAnteriores = idxNoFluxo >= 0 ? fluxoIds.slice(0, idxNoFluxo) : [];

    const deptIdsFallback = Object.keys(processo.respostasHistorico || {})
      .map((k) => Number(k))
      .filter((id) => Number.isFinite(id) && id !== Number(departamentoId));

    const deptIds = (deptIdsAnteriores.length ? deptIdsAnteriores : deptIdsFallback).filter(
      (id, pos, arr) => arr.indexOf(id) === pos
    );

    deptIds.forEach((deptIdNum) => {
      if (deptIdNum === Number(departamentoId)) return;

      const dados = (processo.respostasHistorico as any)?.[String(deptIdNum)] || {};

      const questionarioDepto: Questionario[] =
        (Array.isArray(dados?.questionario) ? dados.questionario : null) ||
        (Array.isArray((processo as any)?.questionariosPorDepartamento?.[String(deptIdNum)])
          ? (processo as any).questionariosPorDepartamento[String(deptIdNum)]
          : []);

      const respostasDepto: Record<string, any> = (dados?.respostas as any) || {};

      const hasRespostas = Object.values(respostasDepto).some(
        (v: any) => v !== undefined && v !== null && String(v).trim() !== ''
      );

      const hasAnexos = questionarioDepto.some((p: any) => {
        if (p?.tipo !== 'file') return false;
        return docsAnexadosPerguntaNoDepartamento(deptIdNum, Number(p.id)).length > 0;
      });

      const hasAlgumDocNoDept = (processo?.documentos || []).some((d: any) => {
        const dDept = Number(d?.departamentoId ?? d?.departamento_id);
        return Number.isFinite(dDept) && dDept === deptIdNum;
      });

      // Exibe dept anterior se houver respostas OU anexos (mesmo que o questionário não tenha sido salvo)
      if (hasRespostas || hasAnexos || hasAlgumDocNoDept) {
        respostasAnteriores.push({
          deptId: deptIdNum,
          dados: {
            ...dados,
            questionario: questionarioDepto,
            respostas: respostasDepto,
          },
        });
      }
    });
  } catch {
    // noop
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {Object.keys(respostas || {}).length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-[9999]">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
          </div>
        </div>
      )}

      <div
        ref={modalContainerRef}
        className="bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
      >
        <LoadingOverlay show={salvandoRespostas} text="Salvando respostas..." />
        <div className={`bg-gradient-to-r ${departamento.cor} p-6 rounded-t-2xl`}>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                {(() => {
                  const Icone = getDepartamentoIcone(departamento.icone);
                  return Icone ? (
                    <Icone className="w-6 h-6 text-white" />
                  ) : (
                    <MessageSquare className="w-6 h-6 text-white" />
                  );
                })()}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white truncate">Questionário - {departamento.nome}</h3>
                <p className="text-white opacity-90 text-sm mt-1 truncate">{processo?.nomeEmpresa}</p>
              </div>
            </div>

            <button
              onClick={handleFecharModal}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSalvar();
          }}
          className="p-6"
        >
          {respostasAnteriores.length > 0 && (
            <div className="mb-8 space-y-6">
              <h4 className="font-semibold text-gray-800 dark:text-[var(--fg)] mb-4 flex items-center gap-2 text-lg">
                <Eye size={18} className="text-blue-500" />
                {somenteLeitura
                  ? 'Respostas do Questionário'
                  : 'Respostas de Departamentos Anteriores'}{' '}
                (somente leitura)
              </h4>

              {respostasAnteriores.map(({ deptId, dados }) => {
                const deptAnt = departamentos.find((d) => d.id === Number(deptId));
                if (!deptAnt) return null;

                const questionarioDepto: Questionario[] = (dados?.questionario as any) || [];
                const respostasDepto: Record<string, any> = (dados?.respostas as any) || {};

                const docsDept = (processo?.documentos || []).filter((d: any) => {
                  const dDept = Number(d?.departamentoId ?? d?.departamento_id);
                  return Number.isFinite(dDept) && dDept === Number(deptId);
                });

                // Se não temos a estrutura do questionário (pode acontecer se não foi salvo),
                // ainda assim mostramos os documentos anexados ao departamento.
                if (questionarioDepto.length === 0) {
                  if (!docsDept.length) return null;

                  return (
                    <div
                      key={deptId}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[var(--muted)] dark:to-[var(--card)] rounded-xl p-6 border-2 border-blue-200 dark:border-[var(--border)] shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200 dark:border-[var(--border)]">
                        <div
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${deptAnt.cor} flex items-center justify-center`}
                        >
                          {(() => {
                            const Icone = getDepartamentoIcone(deptAnt.icone);
                            return Icone ? (
                              <Icone size={20} className="text-white" />
                            ) : (
                              <MessageSquare size={20} className="text-white" />
                            );
                          })()}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-bold text-gray-800 text-lg">{deptAnt.nome}</h5>
                          {dados?.respondidoEm && (
                            <p className="text-sm text-gray-600">
                              Respondido por <span className="font-medium">{dados?.respondidoPor}</span> em{' '}
                              {formatarDataHora(dados.respondidoEm)}
                            </p>
                          )}
                        </div>
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {docsDept.length} documento(s)
                        </span>
                      </div>

                      <div className="space-y-2">
                        {docsDept.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between bg-white dark:bg-[var(--card)] border border-blue-100 dark:border-[var(--border)] rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText size={20} className="text-blue-600 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">{doc.nome}</div>
                                <div className="text-xs text-gray-500">{formatarDataHora(doc.dataUpload)}</div>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => visualizarDocumento(doc)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                                title="Visualizar"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => baixarDocumento(doc)}
                                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-[var(--muted)] rounded-lg"
                                title="Baixar"
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                const deveAparecerNaVisualizacao = (pergunta: Questionario) => {
                  if (!pergunta.condicao) return true;
                  const { perguntaId, operador, valor } = pergunta.condicao;
                  const respostaCondicional = respostasDepto[String(perguntaId)];
                  if (respostaCondicional === undefined || respostaCondicional === null || respostaCondicional === '') {
                    return false;
                  }
                  const r = String(respostaCondicional).trim().toLowerCase();
                  const v = String(valor).trim().toLowerCase();
                  switch (operador) {
                    case 'igual':
                      return r === v;
                    case 'diferente':
                      return r !== v;
                    case 'contem':
                      return r.includes(v);
                    default:
                      return true;
                  }
                };

                const perguntasVisiveis = questionarioDepto.filter((p) => deveAparecerNaVisualizacao(p));
                if (perguntasVisiveis.length === 0) return null;

                const pares: Questionario[][] = [];
                for (let i = 0; i < perguntasVisiveis.length; i += 2) {
                  pares.push(perguntasVisiveis.slice(i, i + 2));
                }

                return (
                  <div
                    key={deptId}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[var(--muted)] dark:to-[var(--card)] rounded-xl p-6 border-2 border-blue-200 dark:border-[var(--border)] shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200 dark:border-[var(--border)]">
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${deptAnt.cor} flex items-center justify-center`}
                      >
                        {(() => {
                          const Icone = getDepartamentoIcone(deptAnt.icone);
                          return Icone ? (
                            <Icone size={20} className="text-white" />
                          ) : (
                            <MessageSquare size={20} className="text-white" />
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-800 text-lg">{deptAnt.nome}</h5>
                        {dados?.respondidoEm && (
                          <p className="text-sm text-gray-600">
                            Respondido por <span className="font-medium">{dados?.respondidoPor}</span> em{' '}
                            {formatarDataHora(dados.respondidoEm)}
                          </p>
                        )}
                      </div>
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {perguntasVisiveis.length} respostas
                      </span>
                    </div>

                    <div className="space-y-4">
                      {pares.map((par, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {par.map((pergunta) => {
                            const resposta = respostasDepto[String(pergunta.id)];
                            return (
                              <div
                                key={pergunta.id}
                                className="bg-white dark:bg-[var(--card)] rounded-lg p-4 border border-blue-100 dark:border-[var(--border)] shadow-sm h-full flex flex-col"
                              >
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  {pergunta.label}
                                  {pergunta.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                                  {pergunta.condicao && (
                                    <span className="ml-2 text-xs text-blue-600"> Condicional</span>
                                  )}
                                </label>

                                <div className="flex-1">
                                  {pergunta.tipo === 'file' ? (
                                    <div className="space-y-2">
                                      {(() => {
                                        const docs = docsAnexadosPerguntaNoDepartamento(Number(deptId), pergunta.id);
                                        return docs.length > 0 ? (
                                          docs.map((doc: any) => (
                                            <div
                                              key={doc.id}
                                              className="flex items-center justify-between bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-[var(--border)] rounded-lg p-3"
                                            >
                                              <div className="flex items-center gap-3 flex-1">
                                                <FileText size={20} className="text-blue-600" />
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-sm text-gray-900 truncate">
                                                    {doc.nome}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    {formatarTamanhoParcela(Number(doc.tamanho || 0))}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => visualizarDocumento(doc)}
                                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                                                  title="Visualizar"
                                                >
                                                  <Eye size={16} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => baixarDocumento(doc)}
                                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                  title="Baixar"
                                                >
                                                  <Download size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center text-sm text-gray-500">
                                            Nenhum arquivo anexado
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  ) : resposta === undefined || resposta === null || String(resposta).trim() === '' ? (
                                    <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-500/10 dark:border-[var(--border)] rounded-lg p-3 text-center text-sm text-yellow-700 dark:text-yellow-200 h-full flex items-center justify-center">
                                      ⚠️ Não respondido
                                    </div>
                                  ) : pergunta.tipo === 'textarea' ? (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 whitespace-pre-wrap text-sm text-gray-800 h-full">
                                      {String(resposta)}
                                    </div>
                                  ) : pergunta.tipo === 'select' ? (
                                    <div className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-[var(--fg)] px-3 py-2 rounded-lg text-sm font-medium inline-block">
                                      {String(resposta)}
                                    </div>
                                  ) : pergunta.tipo === 'boolean' ? (
                                    <div
                                      className={`${String(resposta) === 'Sim'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-[var(--fg)]'
                                        : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-[var(--fg)]'} px-3 py-2 rounded-lg text-sm font-medium inline-block`}
                                    >
                                      {String(resposta)}
                                    </div>
                                  ) : (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm text-gray-800 h-full">
                                      {String(resposta)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <hr className="my-6 border-gray-300 dark:border-[var(--border)]" />
            </div>
          )}

          {carregandoProcesso ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-2">Carregando questionário…</p>
              <p className="text-sm text-gray-500">Buscando detalhes desta solicitação.</p>
            </div>
          ) : questionarioAtual.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">Esta solicitação não possui questionário ainda.</p>
              <p className="text-sm text-gray-500">O questionário será adicionado ao criar a solicitação.</p>
            </div>
          ) : somenteLeitura ? (
            <div className="mb-8">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                <Eye size={18} className="text-blue-500" />
                Respostas do Questionário (somente leitura)
              </h4>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[var(--muted)] dark:to-[var(--card)] rounded-xl p-6 border-2 border-blue-200 dark:border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200 dark:border-[var(--border)]">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${departamento.cor} flex items-center justify-center`}>
                    {(() => {
                      const Icone = getDepartamentoIcone(departamento.icone);
                      return Icone ? (
                        <Icone size={20} className="text-white" />
                      ) : (
                        <MessageSquare size={20} className="text-white" />
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-800 text-lg">{departamento.nome}</h5>
                    {processo.respostasHistorico?.[departamentoId]?.respondidoEm && (
                      <p className="text-sm text-gray-600">
                        Respondido por{' '}
                        <span className="font-medium">
                          {processo.respostasHistorico?.[departamentoId]?.respondidoPor}
                        </span>{' '}
                        em {formatarDataHora(processo.respostasHistorico?.[departamentoId]?.respondidoEm as any)}
                      </p>
                    )}
                  </div>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {questionarioAtual.filter((p) => avaliarCondicao(p, respostas)).length} respostas
                  </span>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const perguntasVisiveis = questionarioAtual.filter((p) => avaliarCondicao(p, respostas));
                    const pares: Questionario[][] = [];
                    for (let i = 0; i < perguntasVisiveis.length; i += 2) {
                      pares.push(perguntasVisiveis.slice(i, i + 2));
                    }
                    return pares.map((par, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {par.map((pergunta) => {
                          const resposta = respostas[String(pergunta.id)];
                          return (
                            <div
                              key={pergunta.id}
                              className="bg-white dark:bg-[var(--card)] rounded-lg p-4 border border-blue-100 dark:border-[var(--border)] shadow-sm h-full flex flex-col"
                            >
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {pergunta.label}
                                {pergunta.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                                {pergunta.condicao && (
                                  <span className="ml-2 text-xs text-blue-600"> Condicional</span>
                                )}
                              </label>
                              <div className="flex-1">
                                {pergunta.tipo === 'file' ? (
                                  renderCampo(pergunta)
                                ) : !resposta ? (
                                  <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-500/10 dark:border-[var(--border)] rounded-lg p-3 text-center text-sm text-yellow-700 dark:text-yellow-200 h-full flex items-center justify-center">
                                    ⚠️ Não respondido
                                  </div>
                                ) : pergunta.tipo === 'textarea' ? (
                                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 whitespace-pre-wrap text-sm text-gray-800 h-full">
                                    {String(resposta)}
                                  </div>
                                ) : pergunta.tipo === 'select' ? (
                                  <div className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-[var(--fg)] px-3 py-2 rounded-lg text-sm font-medium inline-block">
                                    {String(resposta)}
                                  </div>
                                ) : pergunta.tipo === 'boolean' ? (
                                  <div
                                      className={`${String(resposta) === 'Sim'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-[var(--fg)]'
                                      : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-[var(--fg)]'} px-3 py-2 rounded-lg text-sm font-medium inline-block`}
                                  >
                                    {String(resposta)}
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm text-gray-800 h-full">
                                    {String(resposta)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <>
              <h4 className="font-semibold text-gray-800 mb-6">Preencha o Questionário:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {questionarioAtual
                  .filter((p) => avaliarCondicao(p, respostas))
                  .map((pergunta) => (
                    <div
                      key={pergunta.id}
                      className={pergunta.tipo === 'textarea' || pergunta.tipo === 'file' ? 'md:col-span-2' : ''}
                    >
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {pergunta.label}{' '}
                        {pergunta.obrigatorio && <span className="text-red-500">*</span>}
                      </label>
                      {renderCampo(pergunta)}
                    </div>
                  ))}
              </div>
            </>
          )}

          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleFecharModal}
              className="flex-1 min-h-[36px] px-4 py-1.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 hover:shadow-sm text-base font-medium transition-all duration-200"
            >
              Fechar
            </button>

            {!somenteLeitura && processo?.status !== 'finalizado' && (
              <button
                type="submit"
                disabled={salvandoRespostas}
                className="flex-1 min-h-[36px] px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {salvandoRespostas ? 'Salvando...' : 'Salvar Questionário'}
              </button>
            )}

            {/* Botão Editar Quest. */}
            {!somenteLeitura && processo?.status !== 'finalizado' && setShowQuestionarioSolicitacao && (
              <button
                type="button"
                onClick={() => {
                  if (processo && departamento) {
                    setShowQuestionarioSolicitacao({ processoId: processo.id, departamentoId: departamento.id });
                  }
                }}
                className="flex-1 min-h-[36px] px-4 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-base"
              >
                <Pencil size={16} /> Editar Quest.
              </button>
            )}

            {/* Botão Ver Detalhes da Empresa */}
            {setShowListarEmpresas && (
              <button
                type="button"
                onClick={() => {
                  const nome = (processo?.empresa || processo?.nomeEmpresa || '').toString();
                  const encontrada = (empresas || []).find(
                    (e: any) => e.id === processo?.empresaId || e.razao_social === nome || e.apelido === nome
                  );
                  setShowListarEmpresas({
                    tipo: 'cadastradas',
                    empresaId: encontrada?.id,
                  });
                }}
                className="flex-1 min-h-[36px] px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-base"
              >
                🏢 Ver Detalhes da Empresa
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
