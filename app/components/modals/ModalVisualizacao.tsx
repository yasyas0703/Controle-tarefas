'use client';

import React from 'react';
import { X, Calendar, CheckCircle, Star, ArrowRight, FileText, Eye, Download, MessageSquare } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { formatarDataHora } from '@/app/utils/helpers';

interface VisualizacaoCompletaProps {
  processo: any;
  onClose: () => void;
}

export default function VisualizacaoCompleta({ processo, onClose }: VisualizacaoCompletaProps) {
  const { departamentos, setShowUploadDocumento, setShowPreviewDocumento } = useSistema();

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
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors">
              <X size={20} />
            </button>
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

          {departamentosOrdenados.map((dept: any) => {
            const respostasDept = respostasPorDept[dept.id];
            const questionario = Array.isArray(respostasDept?.questionario) ? respostasDept.questionario : [];

            const hasAlgumaResposta =
              !!respostasDept &&
              Object.values(respostasDept.respostas || {}).some(
                (v: any) => v !== undefined && v !== null && String(v).trim() !== ''
              );

            const hasAlgumAnexo = questionario.some((pergunta: any) => {
              if (pergunta?.tipo !== 'file') return false;
              return documentosDaPergunta(dept.id, numero(pergunta?.id)).length > 0;
            });

            // Exibe o departamento se houver respostas OU anexos (perguntas tipo file)
            const hasConteudo = questionario.length > 0 && (hasAlgumaResposta || hasAlgumAnexo);
            if (!hasConteudo) return null;

            const IconeDept = getIconeDepartamento(dept.icone);

            return (
              <div key={dept.id} className="bg-white dark:bg-[var(--card)] rounded-xl p-6 border border-gray-200 dark:border-[var(--border)] shadow-sm">
                <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] mb-4 flex items-center gap-2">
                  {IconeDept ? <IconeDept size={20} /> : null}
                  {dept.nome} {dept.responsavel ? `- ${dept.responsavel}` : ''}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {respostasDept.questionario.map((pergunta: any) => {
                    if (pergunta?.tipo === 'file') {
                      const anexos = documentosDaPergunta(dept.id, numero(pergunta?.id));
                      if (!anexos.length) return null;
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
                                  className="bg-white dark:bg-[var(--card)] rounded-lg p-3 border border-gray-200 dark:border-[var(--border)] flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                      <span className="font-medium text-sm text-gray-800 dark:text-[var(--fg)] truncate">{doc.nome}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{formatarDataHora(doc.dataUpload)}</div>
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
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

                    const resposta = respostasDept.respostas?.[pergunta.id];
                    if (resposta === undefined || resposta === null || String(resposta) === '') return null;
                    return (
                      <div key={pergunta.id} className={pergunta.tipo === 'textarea' ? 'md:col-span-2' : ''}>
                        <div className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-transparent dark:border-[var(--border)]">
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">{pergunta.label}</label>
                          <div className="text-gray-800 dark:text-[var(--fg)]">
                            {pergunta.tipo === 'textarea' ? (
                              <div className="whitespace-pre-wrap">{String(resposta)}</div>
                            ) : (
                              String(resposta)
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="bg-white dark:bg-[var(--card)] rounded-xl p-6 border border-gray-200 dark:border-[var(--border)] shadow-sm">
            <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] mb-4">Histórico Completo</h4>
            <div className="space-y-4">
              {((processo?.historico || processo?.historicoEvento || []) as any[]).map((item: any, index: number) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-[var(--muted)] rounded-xl border border-transparent dark:border-[var(--border)]">
                  <div className="mt-1">
                    {item.tipo === 'inicio' && <Calendar className="text-blue-500" size={16} />}
                    {item.tipo === 'conclusao' && <CheckCircle className="text-green-500" size={16} />}
                    {item.tipo === 'finalizacao' && <Star className="text-yellow-500" size={16} />}
                    {item.tipo === 'movimentacao' && <ArrowRight className="text-purple-500" size={16} />}
                    {item.tipo === 'documento' && <FileText className="text-cyan-600" size={16} />}
                    {item.tipo === 'comentario' && <MessageSquare className="text-gray-600" size={16} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-[var(--fg)]">{item.acao}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      <span className="bg-gray-200 dark:bg-[var(--card)] px-2 py-1 rounded border border-transparent dark:border-[var(--border)]">{item.departamento}</span>
                      <span className="mx-2">•</span>
                      <span>{item.responsavel}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatarDataHora(item.data)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[var(--card)] rounded-xl p-6 border border-gray-200 dark:border-[var(--border)] shadow-sm">
            <h4 className="font-bold text-gray-800 dark:text-[var(--fg)] mb-4 flex items-center justify-between">
              <span>Documentos do Processo</span>
              <button
                onClick={() => {
                  onClose();
                  setShowUploadDocumento(processo);
                }}
                className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-700 flex items-center gap-2"
              >
                <Download size={16} className="opacity-0" />
                Adicionar Documento
              </button>
            </h4>

            {documentos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentos.map((doc: any) => (
                  <div key={doc.id} className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-gray-200 dark:border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="font-medium text-sm">{doc.nome}</span>
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
        </div>
      </div>
    </div>
  );
}
