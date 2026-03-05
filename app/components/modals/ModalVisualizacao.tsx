'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, Star, ArrowRight, FileText, Eye, Download, MessageSquare, ArrowLeft, MoreHorizontal, Activity, FileDown, Link2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { formatarDataHora, formatarNomeArquivo } from '@/app/utils/helpers';
import HistoricoTimeline from '@/app/components/HistoricoTimeline';
import ChecklistDepartamento from '@/app/components/ChecklistDepartamento';
import { buscarHistorico } from '@/app/utils/auditoria';
import { exportarProcessoPDF } from '@/app/utils/exportarPDF';

interface VisualizacaoCompletaProps {
  processo: any;
  onClose: () => void;
}

export default function VisualizacaoCompleta({ processo, onClose }: VisualizacaoCompletaProps) {
  const { departamentos, setShowPreviewDocumento, voltarParaDepartamentoAnterior, usuarioLogado, setShowQuestionario } = useSistema();
  const [abaAtiva, setAbaAtiva] = useState('respostas');
  const [historicoCompleto, setHistoricoCompleto] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Carregar histórico completo quando a aba for selecionada
  useEffect(() => {
    if (abaAtiva === 'historico' && historicoCompleto.length === 0 && processo?.id) {
      setCarregandoHistorico(true);
      buscarHistorico(processo.id)
        .then((dados) => setHistoricoCompleto(dados))
        .catch((err) => console.error('Erro ao carregar histórico:', err))
        .finally(() => setCarregandoHistorico(false));
    }
  }, [abaAtiva, processo?.id, historicoCompleto.length]);

  // Função para exportar PDF
  const handleExportarPDF = async () => {
    try {
      setExportando(true);
      
      // Buscar histórico se ainda não foi carregado
      let historicoParaExportar = historicoCompleto;
      if (historicoParaExportar.length === 0) {
        historicoParaExportar = await buscarHistorico(processo.id);
      }
      
      // Preparar dados do processo para exportação
      const processoParaExportar = {
        ...processo,
        historicoEvento: historicoParaExportar,
      };
      
      await exportarProcessoPDF(processoParaExportar, departamentos);
      
      // Sucesso
      alert('✅ Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('❌ Erro ao gerar relatório PDF. Verifique o console para detalhes.');
    } finally {
      setExportando(false);
    }
  };

  const getIconeDepartamento = (icone: any) => {
    if (typeof icone === 'function') return icone;
    if (typeof icone === 'string' && icone) return (LucideIcons as any)[icone] || null;
    return null;
  };

  const prioridadeTexto = (p?: string) => {
    if (!p) return 'Média';
    return p.charAt(0).toUpperCase() + p.slice(1);
  };

  const respostasPorDept = processo?.respostasHistorico || {};
  const documentos = Array.isArray(processo?.documentos) ? processo.documentos : [];

  const fluxoIds: number[] = Array.isArray((processo as any)?.fluxoDepartamentos)
    ? ((processo as any).fluxoDepartamentos as any[])
        .map((x: any) => Number(x))
        .filter((x: any) => Number.isFinite(x))
    : [];

  const departamentosOrdenados = (fluxoIds.length ? fluxoIds : departamentos.map((d: any) => d?.id))
    .map((id: any) => departamentos.find((d: any) => Number(d?.id) === Number(id)))
    .filter(Boolean) as any[];

  // Mostrar apenas até o departamento atual para evitar expor respostas de etapas posteriores
  // Para processos com departamentos paralelos (deptIndependente), mostrar TODOS os departamentos
  const idxById = departamentosOrdenados.findIndex((d: any) => Number(d?.id) === Number(processo?.departamentoAtual));
  const departamentoAtualIndex = idxById >= 0
    ? idxById
    : (Number.isFinite(Number(processo?.departamentoAtualIndex)) ? Number(processo.departamentoAtualIndex) : -1);

  const departamentosVisiveis = processo?.deptIndependente
    ? departamentosOrdenados
    : (departamentoAtualIndex >= 0
        ? departamentosOrdenados.slice(0, departamentoAtualIndex + 1)
        : departamentosOrdenados);

  const numero = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const documentosDaPergunta = (deptId: number, perguntaId: number) => {
    return documentos.filter((d: any) => {
      const dDept = numero(d?.departamentoId ?? d?.departamento_id);
      const dPerg = numero(d?.perguntaId ?? d?.pergunta_id);
      if (dPerg !== perguntaId) return false;
      // Alguns uploads antigos podem ter departamentoId nulo; ainda assim o anexo pertence à pergunta
      if (!Number.isFinite(dDept)) return true;
      return dDept === deptId;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[1050] p-4">
      <div className="bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">Processo Completo</h3>
              <p className="text-white opacity-90 text-sm">
                {(() => {
                  const nomeEmpresa = processo?.nomeEmpresa;
                  if (nomeEmpresa) return nomeEmpresa;

                  const emp = (processo as any)?.empresa;
                  if (typeof emp === 'string') return emp;
                  if (emp && typeof emp === 'object') {
                    return emp.razao_social || emp.apelido || emp.codigo || 'Empresa';
                  }

                  return 'Empresa';
                })()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportarPDF}
                disabled={exportando}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar relatório completo em PDF"
              >
                <FileDown size={18} />
                {exportando ? 'Gerando PDF...' : 'Exportar PDF'}
              </button>
              
              {processo?.status !== 'finalizado' && (Number(processo?.departamentoAtualIndex ?? 0) > 0) && (
                <button
                  onClick={async () => {
                    await voltarParaDepartamentoAnterior(processo.id);
                    onClose();
                  }}
                  className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
              )}

              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-xl p-6 border border-transparent dark:border-[var(--border)]">
            <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] mb-4">Informações Gerais</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">Cliente:</span>
                <div className="text-gray-800 dark:text-[var(--fg)]">{processo?.cliente || '-'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">Status:</span>
                <div className="text-gray-800 dark:text-[var(--fg)]">{processo?.status || '-'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-300">Prioridade:</span>
                <div className="text-gray-800 dark:text-[var(--fg)]">{prioridadeTexto(processo?.prioridade)}</div>
              </div>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex gap-4 border-b-2 border-gray-200 dark:border-[var(--border)]">
            <button
              onClick={() => setAbaAtiva('respostas')}
              className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 -mb-0.5 ${
                abaAtiva === 'respostas'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              📋 Cadastro & Respostas
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 -mb-0.5 ${
                abaAtiva === 'historico'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              🕒 Histórico Completo
            </button>
            <button
              onClick={() => setAbaAtiva('documentos')}
              className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 -mb-0.5 ${
                abaAtiva === 'documentos'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              📎 Documentos
            </button>
          </div>

          {/* Conteúdo das Abas */}
          {abaAtiva === 'respostas' && (
            <>
              {/* ===== QUESTIONÁRIOS DE PROCESSOS INTERLIGADOS (aparecem primeiro, como histórico) ===== */}
              {Array.isArray((processo as any)?.respostasInterligadas) && (processo as any).respostasInterligadas.length > 0 && (
                (processo as any).respostasInterligadas.map((interligado: any) => {
                  const deptEntries = Object.entries(interligado.departamentos || {});
                  if (deptEntries.length === 0) return null;
                  const docsInterligados = Array.isArray(interligado.documentos) ? interligado.documentos : [];
                  return deptEntries.map(([deptIdStr, deptData]: [string, any]) => {
                    const deptId = Number(deptIdStr);
                    const dept = departamentos.find((d: any) => Number(d?.id) === deptId);
                    const questionario = Array.isArray(deptData?.questionario) ? deptData.questionario : [];
                    const respostas = deptData?.respostas || {};
                    if (questionario.length === 0) return null;
                    const IconeDept = dept ? getIconeDepartamento(dept.icone) : null;

                    // Função para buscar documentos do interligado vinculados a uma pergunta
                    const docsInterligadosDaPergunta = (perguntaId: number) => {
                      return docsInterligados.filter((d: any) => {
                        const dPerg = numero(d?.perguntaId ?? d?.pergunta_id);
                        return dPerg === perguntaId;
                      });
                    };

                    return (
                      <div key={`interligado-${interligado.processoId}-${deptId}`} className="bg-white dark:bg-[var(--card)] rounded-xl p-6 border border-purple-300 dark:border-purple-600 shadow-sm relative">
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-semibold max-w-[60%] text-right">
                          <Link2 size={12} className="flex-shrink-0" />
                          <span className="truncate">
                            🔗 {interligado.processoNome}{interligado.processoEmpresa ? ` — ${interligado.processoEmpresa}` : ''} (#{interligado.processoId})
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] mb-4 flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            {IconeDept ? <IconeDept size={20} /> : null}
                            <div className="min-w-0">
                              <div className="truncate">{dept?.nome || `Departamento #${deptId}`} {dept?.responsavel ? `- ${dept.responsavel}` : ''}</div>
                            </div>
                          </div>
                        </h4>
                        {deptData?.respondidoPor && (
                          <p className="text-xs text-gray-500 mb-3">Respondido por: {deptData.respondidoPor} {deptData?.respondidoEm ? `em ${new Date(deptData.respondidoEm).toLocaleDateString('pt-BR')}` : ''}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {questionario.map((pergunta: any) => {
                            const tipoLower = (pergunta.tipo || '').toString().toLowerCase();

                            // Tratamento especial para perguntas do tipo file
                            if (tipoLower === 'file') {
                              const anexos = docsInterligadosDaPergunta(numero(pergunta.id));
                              if (!anexos.length) {
                                return (
                                  <div key={pergunta.id} className="md:col-span-2">
                                    <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{pergunta.label}</label>
                                      <div className="text-sm text-gray-500 italic">Nenhum arquivo anexado</div>
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div key={pergunta.id} className="md:col-span-2">
                                  <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{pergunta.label}</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {anexos.map((doc: any) => (
                                        <div
                                          key={doc.id}
                                          className="bg-white dark:bg-[var(--card)] rounded-lg p-3 border border-gray-200 dark:border-[var(--border)] flex items-center justify-between gap-3 w-full overflow-hidden"
                                        >
                                          <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                              <span className="block font-medium text-sm text-gray-800 dark:text-[var(--fg)] truncate" title={doc.nome}>{formatarNomeArquivo(doc.nome)}</span>
                                            </div>
                                            {doc.dataUpload && <div className="text-xs text-gray-500 mt-1">{formatarDataHora(doc.dataUpload)}</div>}
                                          </div>
                                          <div className="flex gap-1 flex-shrink-0 justify-end ml-3">
                                            <button
                                              onClick={() => setShowPreviewDocumento(doc)}
                                              className="p-1 text-cyan-600 hover:bg-cyan-100 rounded"
                                              title="Visualizar"
                                            >
                                              <Eye size={14} />
                                            </button>
                                            {doc.url && (
                                              <a
                                                href={doc.url}
                                                download={doc.nome}
                                                className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-[var(--muted)] rounded"
                                                title="Baixar"
                                              >
                                                <Download size={14} />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const valor = respostas[String(pergunta.id)];
                            const hasValor = valor !== undefined && valor !== null && String(valor).trim() !== '';

                            // Tratamento para checkbox
                            let valorFormatado: any = valor;
                            if (tipoLower === 'checkbox' && hasValor) {
                              try {
                                const valores = typeof valor === 'string' ? JSON.parse(valor) : valor;
                                valorFormatado = Array.isArray(valores)
                                  ? valores
                                      .map((v: any) => {
                                        const s = String(v ?? '');
                                        const m = s.match(/^\d+\|(.*)$/);
                                        return m ? m[1] : s;
                                      })
                                      .filter((x: string) => x.trim())
                                      .join(', ')
                                  : String(valor);
                              } catch {
                                valorFormatado = String(valor);
                              }
                            }

                            return (
                              <div key={pergunta.id} className={tipoLower === 'textarea' ? 'md:col-span-2' : ''}>
                                <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">{pergunta.label}</label>
                                  {hasValor ? (
                                    <div className="text-gray-800 dark:text-[var(--fg)]">
                                      {tipoLower === 'textarea' ? (
                                        <div className="whitespace-pre-wrap">{String(valorFormatado)}</div>
                                      ) : typeof valor === 'boolean' ? (
                                        valor ? 'Sim' : 'Não'
                                      ) : (
                                        String(valorFormatado)
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-400 italic">Sem resposta</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })
              )}

              {/* ===== DEPARTAMENTOS DO PROCESSO ATUAL ===== */}
              {departamentosVisiveis.map((dept: any) => {
            const respostasDept = respostasPorDept[dept.id];
            
            // Buscar questionários do processo para este departamento (incluindo os que não têm respostas)
            let questionario = Array.isArray(respostasDept?.questionario) ? respostasDept.questionario : [];
            
            // Se não houver questionário em respostasDept, buscar em processo.questionariosPorDepartamento
            if (questionario.length === 0 && processo?.questionariosPorDepartamento) {
              const questDoDept = processo.questionariosPorDepartamento[dept.id];
              if (Array.isArray(questDoDept)) {
                questionario = questDoDept;
              }
            }

            const hasAlgumaResposta =
              !!respostasDept &&
              Object.values(respostasDept.respostas || {}).some(
                (v: any) => v !== undefined && v !== null && String(v).trim() !== ''
              );

            const hasAlgumAnexo = questionario.some((pergunta: any) => {
              if ((pergunta?.tipo || '').toString().toLowerCase() !== 'file') return false;
              return documentosDaPergunta(dept.id, numero(pergunta?.id)).length > 0;
            });

            const hasPerguntasFile = questionario.some((p: any) => (p?.tipo || '').toString().toLowerCase() === 'file');

            // SEMPRE exibir se houver questionário (mesmo que seja só file sem resposta)
            const hasConteudo = questionario.length > 0;
            if (!hasConteudo) return null;

            const IconeDept = getIconeDepartamento(dept.icone);

            return (
              <div key={dept.id} className="bg-white dark:bg-[var(--card)] rounded-xl p-6 border border-gray-200 dark:border-[var(--border)] shadow-sm">
                <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] mb-4 flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    {IconeDept ? <IconeDept size={20} /> : null}
                    <div className="min-w-0">
                      <div className="truncate">{dept.nome} {dept.responsavel ? `- ${dept.responsavel}` : ''}</div>
                    </div>
                  </div>
                  <div>
                    {usuarioLogado && (String(usuarioLogado.role || '').toUpperCase() === 'ADMIN' || String(usuarioLogado.role || '').toUpperCase() === 'GERENTE' || Number(usuarioLogado.departamentoId) === Number(dept.id)) && (
                      <button
                        onClick={() => setShowQuestionario({ processoId: processo.id, departamento: dept.id, somenteLeitura: false, allowEditFinalizado: true })}
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-[var(--border)] text-gray-600"
                        title="Editar questionário deste departamento"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  </div>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questionario.map((pergunta: any) => {
                    const tipoPerguntaLower = (pergunta?.tipo || '').toString().toLowerCase();
                    if (tipoPerguntaLower === 'file') {
                      const anexos = documentosDaPergunta(dept.id, numero(pergunta?.id));
                      
                      if (!anexos.length) {
                        // Verificar se existem anexos no backend, mas são restritos para o usuário atual
                        const counts: Record<string, number> = (processo as any)?.documentosCounts ?? {};
                        const keySpecific = `${pergunta.id}:${dept.id}`;
                        const keyAny = `${pergunta.id}:0`;
                        const total = Number(counts[keySpecific] ?? counts[keyAny] ?? 0);
                        if (total > 0) {
                          return (
                            <div key={pergunta.id} className="md:col-span-2">
                              <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{pergunta.label}</label>
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                  <span>Respondido — anexo enviado (sem permissão para visualizar)</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Mostrar campo vazio mesmo sem anexos (para debug)
                        return (
                          <div key={pergunta.id} className="md:col-span-2">
                            <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{pergunta.label}</label>
                              <div className="text-sm text-gray-500 italic">Nenhum arquivo anexado</div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={pergunta.id} className="md:col-span-2">
                          <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                            <label className="block text-sm font-medium text-gray-600 mb-3">
                              {pergunta.label}
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {anexos.map((doc: any) => (
                                <div
                                  key={doc.id}
                                  className="bg-white dark:bg-[var(--card)] rounded-lg p-3 border border-gray-200 dark:border-[var(--border)] flex items-center justify-between gap-3 w-full overflow-hidden"
                                >
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                      <span className="block font-medium text-sm text-gray-800 dark:text-[var(--fg)] truncate max-w-[calc(100%-96px)]" title={doc.nome}>{formatarNomeArquivo(doc.nome)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{formatarDataHora(doc.dataUpload)}</div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0 w-24 justify-end ml-3">
                                    <button
                                      onClick={() => setShowPreviewDocumento(doc)}
                                      className="p-1 text-cyan-600 hover:bg-cyan-100 rounded"
                                      title="Visualizar"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <a
                                      href={doc.url}
                                      download={doc.nome}
                                      className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-[var(--muted)] rounded"
                                      title="Baixar"
                                    >
                                      <Download size={14} />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const resposta = respostasDept?.respostas?.[pergunta.id];
                    if (resposta === undefined || resposta === null || String(resposta) === '') return null;
                    
                    // Tratamento especial para checkbox
                    let respostaFormatada: any = resposta;
                    if (tipoPerguntaLower === 'checkbox') {
                      try {
                        const valores = typeof resposta === 'string' ? JSON.parse(resposta) : resposta;
                        respostaFormatada = Array.isArray(valores)
                          ? valores
                              .map((v: any) => {
                                const s = String(v ?? '');
                                const m = s.match(/^\d+\|(.*)$/);
                                return m ? m[1] : s;
                              })
                              .filter((x: string) => x.trim())
                              .join(', ')
                          : String(resposta);
                      } catch {
                        respostaFormatada = String(resposta);
                      }
                    }
                    
                    return (
                      <div key={pergunta.id} className={tipoPerguntaLower === 'textarea' ? 'md:col-span-2' : ''}>
                        <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">{pergunta.label}</label>
                          <div className="text-gray-800 dark:text-[var(--fg)]">
                            {tipoPerguntaLower === 'textarea' ? (
                              <div className="whitespace-pre-wrap">{String(respostaFormatada)}</div>
                            ) : (
                              String(respostaFormatada)
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Checklist de Validação */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[var(--border)]">
                  <ChecklistDepartamento
                    questionarios={questionario}
                    documentosObrigatorios={dept.documentosObrigatorios || []}
                    respostas={respostasDept?.respostas || {}}
                    documentos={documentos.map((d: any) => ({
                      ...d,
                      perguntaId: numero(d?.perguntaId ?? d?.pergunta_id),
                      departamentoId: numero(d?.departamentoId ?? d?.departamento_id),
                    }))}
                    departamentoNome={dept.nome}
                  />
                </div>
              </div>
            );
          })}
            </>
          )}

          {/* Aba Histórico Completo */}
          {abaAtiva === 'historico' && (
            <div className="bg-white dark:bg-[var(--card)] rounded-xl p-6 border border-gray-200 dark:border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Activity size={24} className="text-green-500" />
                <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] text-xl">
                  Histórico Completo de Auditoria
                </h4>
              </div>
              {carregandoHistorico ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-gray-500 dark:text-gray-400 mt-4">Carregando histórico...</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <HistoricoTimeline historico={historicoCompleto} />
                </div>
              )}
            </div>
          )}

          {/* Aba Documentos */}
          {abaAtiva === 'documentos' && (
            <div className="bg-white dark:bg-[var(--card)] rounded-xl p-6 border border-gray-200 dark:border-[var(--border)] shadow-sm">
              <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] mb-4">Documentos do Processo</h4>

              {documentos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentos.map((doc: any) => (
                    <div key={doc.id} className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-gray-200 dark:border-[var(--border)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className="text-gray-400" />
                          <span className="font-medium text-sm truncate max-w-[calc(100%-88px)]" title={doc.nome}>{formatarNomeArquivo(doc.nome)}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setShowPreviewDocumento(doc)} className="p-1 text-cyan-600 hover:bg-cyan-100 rounded">
                            <Eye size={14} />
                          </button>
                          <a href={doc.url} download={doc.nome} className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-[var(--card)] rounded">
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {(Number(doc.tamanho || 0) / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <div className="text-xs text-gray-500">{formatarDataHora(doc.dataUpload)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Nenhum documento enviado ainda</p>
                </div>
              )}
            </div>
          )}

          {/* Histórico Resumido (para aba de respostas) - REMOVIDO DAQUI */}
          {/* Documentos (para aba de respostas) - MOVIDO PARA ABA PRÓPRIA */}

        </div>
      </div>
    </div>
  );
}
