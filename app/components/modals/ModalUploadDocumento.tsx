'use client';

import React from 'react';
import { X, Upload, File, Trash2, Download } from 'lucide-react';
import { Processo } from '@/app/types';
import { useSistema } from '@/app/context/SistemaContext';
import { api } from '@/app/utils/api';
import { formatarTamanhoParcela, formatarDataHora } from '@/app/utils/helpers';
import ModalBase from './ModalBase';
import LoadingOverlay from '../LoadingOverlay';

interface ModalUploadDocumentoProps {
  processo?: Processo;
  perguntaId?: number | null;
  perguntaLabel?: string | null;
  onClose: () => void;
}

export default function ModalUploadDocumento({
  processo,
  perguntaId = null,
  perguntaLabel = null,
  onClose,
}: ModalUploadDocumentoProps) {
  const { adicionarDocumentoProcesso, adicionarNotificacao, mostrarAlerta } = useSistema();
  const [uploading, setUploading] = React.useState(false);
  const [arquivos, setArquivos] = React.useState<Array<{ id: number; nome: string; tamanho: number; tipo: string; file: File }>>([]);
  const [arrastando, setArrastando] = React.useState(false);

  const [documentosLocal, setDocumentosLocal] = React.useState<any[]>(processo?.documentos || []);

  React.useEffect(() => {
    setDocumentosLocal(processo?.documentos || []);
  }, [processo?.id, processo?.documentos]);

  const documentos = documentosLocal;
  const documentosFiltrados = React.useMemo(() => {
    if (perguntaId) {
      return documentos.filter((d: any) => Number(d.perguntaId) === Number(perguntaId));
    }

    // Quando aberto para um processo, mostrar apenas os documentos do departamento atual
    // do processo (comportamento solicitado pelo usuário). Isso evita que documentos
    // de departamentos anteriores apareçam no modal de upload após avançar o processo.
    if (processo && typeof processo.departamentoAtual === 'number') {
      return documentos.filter((d: any) => Number(d.departamentoId) === Number(processo.departamentoAtual));
    }

    return documentos;
  }, [documentos, perguntaId, processo?.departamentoAtual]);

  const handleArquivosSelecionados = (fileList: FileList | null) => {
    if (!fileList) return;
    const novos = Array.from(fileList).map((f, idx) => ({ id: Date.now() + idx, nome: f.name, tamanho: f.size, tipo: f.type || 'application/octet-stream', file: f }));
    setArquivos(prev => [...prev, ...novos]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastando(false);
    handleArquivosSelecionados(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastando(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastando(false);
  };

  const enviar = async () => {
    if (!processo || arquivos.length === 0) return;
    setUploading(true);
    let sucessos = 0;
    let erros = 0;
    const mensagensErro: string[] = [];
    try {
      for (let i = 0; i < arquivos.length; i++) {
        const a = arquivos[i];
        try {
          await adicionarDocumentoProcesso(
            processo.id,
            a.file,
            a.tipo,
            processo.departamentoAtual,
            perguntaId ?? undefined
          );
          sucessos++;
        } catch (err: any) {
          erros++;
          const msg = err instanceof Error ? err.message : String(err);
          if (msg && !mensagensErro.includes(msg)) mensagensErro.push(msg);
        }
      }
      setArquivos([]);
      if (sucessos > 0) {
        adicionarNotificacao(sucessos === 1 ? '✅ Documento enviado com sucesso!' : `✅ ${sucessos} documentos enviados com sucesso!`, 'sucesso');
        onClose();
      }
      if (erros > 0) {
        const detalhe = mensagensErro.length > 0 ? `\n\nDetalhe: ${mensagensErro.join(' | ')}` : '';
        await mostrarAlerta('Erro no Upload', `${erros} arquivo(s) não puderam ser enviados${detalhe}`, 'erro');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemover = async (id: number) => {
    if (!processo) return;
    try {
      setUploading(true);
      await api.excluirDocumento(id);
      setDocumentosLocal(prev => prev.filter((d: any) => d.id !== id));
      adicionarNotificacao('Documento excluído com sucesso', 'sucesso');
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir documento';
      await mostrarAlerta('Erro', msg, 'erro');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc: any) => {
    try {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // noop
    }
  };

  return (
    <ModalBase isOpen onClose={onClose} labelledBy="upload-title" dialogClassName="w-full max-w-2xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto" zIndex={1020}>
      <div className="rounded-2xl relative">
        <LoadingOverlay show={uploading} text="Enviando documento(s)..." />
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="upload-title" className="text-xl font-bold text-white flex items-center gap-2">
                <Upload size={20} />
                {perguntaId ? 'Upload para Pergunta' : 'Upload de Documentos Gerais'}
              </h2>
              {perguntaLabel && (
                <p className="text-white opacity-90 text-sm mt-1">Para: {perguntaLabel}</p>
              )}
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {processo && (
            <div className="bg-cyan-50 dark:bg-[#0f2b34] rounded-xl p-4 border border-cyan-200 dark:border-[#155e75]">
              <h4 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-1">{processo.nomeEmpresa}</h4>
              {processo.cliente && (
                <p className="text-sm text-cyan-600 dark:text-cyan-300">Cliente: {processo.cliente}</p>
              )}
              {perguntaLabel && (
                <p className="text-sm text-cyan-600 dark:text-cyan-300 mt-1"><strong>Pergunta:</strong> {perguntaLabel}</p>
              )}
            </div>
          )}

          {/* Área de Upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${arrastando ? 'border-cyan-500 bg-cyan-50' : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'} cursor-pointer relative`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              onChange={(e) => handleArquivosSelecionados(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload size={48} className="mx-auto text-gray-400 dark:text-gray-300 mb-4" />
            <p className="text-gray-600 dark:text-gray-200 mb-2">Arraste e solte os arquivos aqui, ou clique para selecionar</p>
            <span className="inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg">Selecionar Arquivos</span>
          </div>

          {/* Lista de selecionados */}
          {arquivos.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Arquivos Selecionados ({arquivos.length})
              </h3>
              <div className="space-y-2">
                {arquivos.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-[var(--border)] rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--muted)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <File size={20} className="text-gray-400 dark:text-gray-300" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{a.nome}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">{formatarTamanhoParcela(Number(a.tamanho || 0))}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setArquivos(prev => prev.filter(x => x.id !== a.id))}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Documentos já enviados (abaixo dos selecionados) */}
          {documentosFiltrados.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Documentos Enviados ({documentosFiltrados.length})
              </h3>
              <div className="space-y-2">
                {documentosFiltrados.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-[var(--border)] rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--muted)] transition-colors">
                    <div className="flex items-center gap-3">
                      <File size={20} className="text-gray-400 dark:text-gray-300" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{doc.nome}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">{formatarTamanhoParcela(Number(doc.tamanho || 0))} • {formatarDataHora(doc.dataUpload)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleDownload(doc)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-[#132235] rounded transition-colors">
                        <Download size={18} />
                      </button>
                      <button onClick={() => handleRemover(doc.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-[#3b1f26] rounded transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-[var(--border)]">
            <button onClick={onClose} className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-[var(--border)] rounded-xl hover:bg-gray-100 dark:hover:bg-[var(--muted)]">Cancelar</button>
            <button onClick={enviar} disabled={arquivos.length === 0 || uploading} className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading ? 'Enviando...' : `Enviar ${arquivos.length} Documento(s)`}
            </button>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}
