'use client';

import React from 'react';
import { X, Save, Upload, FileText, Eye, Download, MessageSquare, CheckCircle, Pencil } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
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

  const modalContainerRef = React.useRef<HTMLDivElement | null>(null);

  const questionarioAtual: Questionario[] =
    ((processo?.questionariosPorDepartamento as any)?.[String(departamentoId)] as any) ||
    (processo?.questionarioSolicitacao as any) ||
    (processo as any)?.questionario ||
    (processo as any)?.questionarios ||
    [];

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
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
            required={pergunta.obrigatorio}
            placeholder="Digite sua resposta"
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
            onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 resize-vertical"
            required={pergunta.obrigatorio}
            placeholder="Digite sua resposta"
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
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center">
                  <FileText size={26} className="mx-auto text-blue-300 mb-2" />
                  <p className="text-sm text-blue-700">Nenhum documento anexado ainda</p>
                  {!bloqueado && (
                    <p className="text-xs text-blue-500 mt-1">
                      Clique em &quot;Anexar Arquivo&quot; para enviar documentos
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {docsAnexados.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="bg-blue-50 border border-blue-200 rounded-xl p-3 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="text-blue-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-semibold text-gray-900 truncate"
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

  const respostasAnteriores: Record<string, any> = {};
  try {
    Object.entries(processo.respostasHistorico || {}).forEach(([deptId, dados]: any) => {
      if (Number(deptId) === Number(departamentoId)) return;
      if (dados?.respostas && Object.keys(dados.respostas).length > 0) {
        respostasAnteriores[deptId] = dados;
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className={`bg-gradient-to-r ${departamento.cor} p-6 rounded-t-2xl`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare size={24} />
                Questionário - {departamento.nome}
              </h3>
              <p className="text-white opacity-90 text-sm mt-1">{processo?.nomeEmpresa}</p>
            </div>
            <button
              onClick={handleFecharModal}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
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
          {Object.keys(respostasAnteriores).length > 0 && (
            <div className="mb-8 space-y-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                <Eye size={18} className="text-blue-500" />
                {somenteLeitura
                  ? 'Respostas do Questionário'
                  : 'Respostas de Departamentos Anteriores'}{' '}
                (somente leitura)
              </h4>

              {Object.entries(respostasAnteriores).map(([deptId, dados]: any) => {
                const deptAnt = departamentos.find((d) => d.id === Number(deptId));
                if (!deptAnt) return null;

                const questionarioDepto: Questionario[] = (dados?.questionario as any) || [];
                const respostasDepto: Record<string, any> = (dados?.respostas as any) || {};
                if (questionarioDepto.length === 0) return null;

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
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200">
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${deptAnt.cor} flex items-center justify-center`}
                      >
                        {deptAnt.icone ? <deptAnt.icone size={20} className="text-white" /> : <MessageSquare size={20} className="text-white" />}
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
                                className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm h-full flex flex-col"
                              >
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  {pergunta.label}
                                  {pergunta.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                                  {pergunta.condicao && (
                                    <span className="ml-2 text-xs text-blue-600"> Condicional</span>
                                  )}
                                </label>

                                <div className="flex-1">
                                  {!resposta ? (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center text-sm text-yellow-700 h-full flex items-center justify-center">
                                      ⚠️ Não respondido
                                    </div>
                                  ) : pergunta.tipo === 'file' ? (
                                    <div className="space-y-2">
                                      {(() => {
                                        const docs = docsAnexadosPergunta(pergunta.id);
                                        return docs.length > 0 ? (
                                          docs.map((doc: any) => (
                                            <div
                                              key={doc.id}
                                              className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
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
                                  ) : pergunta.tipo === 'textarea' ? (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 whitespace-pre-wrap text-sm text-gray-800 h-full">
                                      {String(resposta)}
                                    </div>
                                  ) : pergunta.tipo === 'select' ? (
                                    <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium inline-block">
                                      {String(resposta)}
                                    </div>
                                  ) : pergunta.tipo === 'boolean' ? (
                                    <div
                                      className={`${String(resposta) === 'Sim'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'} px-3 py-2 rounded-lg text-sm font-medium inline-block`}
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

              <hr className="my-6 border-gray-300" />
            </div>
          )}

          {questionarioAtual.length === 0 ? (
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${departamento.cor} flex items-center justify-center`}>
                    {departamento.icone ? <departamento.icone size={20} className="text-white" /> : <MessageSquare size={20} className="text-white" />}
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
                              className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm h-full flex flex-col"
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
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center text-sm text-yellow-700 h-full flex items-center justify-center">
                                    ⚠️ Não respondido
                                  </div>
                                ) : pergunta.tipo === 'textarea' ? (
                                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 whitespace-pre-wrap text-sm text-gray-800 h-full">
                                    {String(resposta)}
                                  </div>
                                ) : pergunta.tipo === 'select' ? (
                                  <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium inline-block">
                                    {String(resposta)}
                                  </div>
                                ) : pergunta.tipo === 'boolean' ? (
                                  <div
                                    className={`${String(resposta) === 'Sim'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'} px-3 py-2 rounded-lg text-sm font-medium inline-block`}
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
                className="flex-1 min-h-[36px] px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-semibold flex items-center justify-center gap-2 text-base"
              >
                <Save size={16} />
                Salvar Questionário
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
