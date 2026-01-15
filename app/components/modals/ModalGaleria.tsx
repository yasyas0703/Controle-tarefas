'use client';

import React from 'react';
import { X, File, Download, Eye, Trash2 } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { Documento } from '@/app/types';
import { formatarTamanhoParcela, formatarDataHora } from '@/app/utils/helpers';
import { api } from '@/app/utils/api';

interface GaleriaDocumentosProps {
  onClose: () => void;
  departamentoId?: number;
  processoId?: number;
  titulo?: string;
}

export default function GaleriaDocumentos({ onClose, departamentoId, processoId, titulo }: GaleriaDocumentosProps) {
  const { processos, departamentos, setProcessos, adicionarNotificacao, mostrarAlerta, setShowPreviewDocumento } = useSistema();

  const [docsCarregados, setDocsCarregados] = React.useState<Documento[]>([]);
  const [carregando, setCarregando] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // If opened for a specific processo, fetch its documents from backend.
    if (typeof processoId === 'number') {
      void (async () => {
        try {
          setCarregando(true);
          const list = await api.getDocumentos(processoId);
          if (cancelled) return;
          const filtrados = (Array.isArray(list) ? list : [])
            .filter((d: any) => (typeof departamentoId === 'number' ? Number(d.departamentoId) === Number(departamentoId) : true))
            .sort((a: any, b: any) => new Date(b.dataUpload as any).getTime() - new Date(a.dataUpload as any).getTime());
          setDocsCarregados(filtrados as any);
        } finally {
          if (!cancelled) setCarregando(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // If opened for a department (no processoId), try to load documents from all processes
    // that report having documents. This ensures recently uploaded files appear even when
    // the `processos` state is using a lite fetch that doesn't include all documentos.
    void (async () => {
      try {
        setCarregando(true);
        // Collect processoIds that may have documents
        const possiveisProcessos: number[] = (processos || [])
          .filter((p: any) => Number(p.documentosCount || 0) > 0)
          .map((p: any) => Number(p.id))
          .filter((id: number) => Number.isFinite(id));

        const acumulado: any[] = [];
        for (const pid of possiveisProcessos) {
          try {
            const list = await api.getDocumentos(pid);
            const arr = Array.isArray(list) ? list : [];
            for (const d of arr) {
              if (typeof departamentoId === 'number' && Number(d.departamentoId) !== Number(departamentoId)) continue;
              acumulado.push(d);
            }
          } catch (err) {
            // ignore per-process failures
          }
        }

        if (!cancelled) {
          const uniq = acumulado
            .filter(Boolean)
            .sort((a: any, b: any) => new Date(b.dataUpload as any).getTime() - new Date(a.dataUpload as any).getTime());
          setDocsCarregados(uniq as any);
        }
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [processoId, departamentoId]);

  const documentos: Documento[] = React.useMemo(() => {
    // Se temos processoId, preferimos a fonte do backend (lista completa)
    if (typeof processoId === 'number') return docsCarregados;

    // If opened per-department and we fetched docsCarregados by querying each processo,
    // prefer that list when available to ensure newest files are shown.
    if (Array.isArray(docsCarregados) && docsCarregados.length > 0) return docsCarregados;

    const all = (processos || []).flatMap((p) => (p.documentos || []) as Documento[]);

    let filtrados = all;
    if (typeof processoId === 'number') {
      filtrados = filtrados.filter((d) => Number(d.processoId) === Number(processoId));
    }
    if (typeof departamentoId === 'number') {
      filtrados = filtrados.filter((d) => Number(d.departamentoId) === Number(departamentoId));
    }

    return filtrados.sort((a, b) => {
      const da = new Date(a.dataUpload as any).getTime();
      const db = new Date(b.dataUpload as any).getTime();
      return db - da;
    });
  }, [processos, departamentoId, processoId, docsCarregados]);

  const getIconeByTipo = (tipo: string) => {
    return <File size={24} className="text-gray-400" />;
  };

  const getNomeDepartamento = (id?: number) => {
    if (!id) return '—';
    return departamentos.find((d) => d.id === id)?.nome || '—';
  };

  const handleVer = (doc: Documento) => {
    if (!doc.url) return;
    setShowPreviewDocumento(doc);
  };

  const handleDownload = (doc: Documento) => {
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

  const handleApagar = async (doc: Documento) => {
    try {
      await api.excluirDocumento(doc.id);

      // Se a galeria foi aberta com processoId, a fonte de verdade é o backend (docsCarregados)
      if (typeof processoId === 'number') {
        setDocsCarregados(prev => prev.filter((d: any) => Number(d.id) !== Number(doc.id)));
      } else {
        // Fallback: remove da lista em memória (não faz PUT em /processos)
        setProcessos(prev => prev.map((p: any) => {
          if (Number(p.id) !== Number(doc.processoId)) return p;
          return {
            ...p,
            documentos: Array.isArray(p.documentos)
              ? p.documentos.filter((d: any) => Number(d.id) !== Number(doc.id))
              : p.documentos,
          };
        }));
      }

      adicionarNotificacao('Documento excluído com sucesso', 'sucesso');
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir documento';
      await mostrarAlerta('Erro', msg, 'erro');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl transform transition-all duration-300 max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-t-2xl sticky top-0 z-10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {titulo || 'Galeria de Documentos'}
            {!titulo && departamentoId ? ` — ${getNomeDepartamento(departamentoId)}` : ''}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-96px)]">
          {carregando ? (
            <div className="text-center py-12 text-gray-500">
              <File size={48} className="mx-auto mb-2 opacity-30" />
              <p>Carregando documentos…</p>
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <File size={48} className="mx-auto mb-2 opacity-30" />
              <p>Nenhum documento disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:bg-gray-50"
                >
                  <div className="flex justify-center mb-3">{getIconeByTipo(doc.tipo)}</div>
                  <p className="font-medium text-gray-900 text-sm text-center truncate">
                    {doc.nome}
                  </p>
                  <p className="text-xs text-gray-600 text-center mt-1">
                    {formatarTamanhoParcela(Number(doc.tamanho || 0))} • {doc.tipo}
                  </p>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    {getNomeDepartamento(doc.departamentoId)} • {formatarDataHora(doc.dataUpload)}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleVer(doc)}
                      className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      <span className="text-xs">Ver</span>
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex-1 p-2 text-cyan-600 hover:bg-cyan-50 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Download size={14} />
                      <span className="text-xs">Baixar</span>
                    </button>
                    <button
                      onClick={() => handleApagar(doc)}
                      className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={14} />
                      <span className="text-xs">Apagar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
