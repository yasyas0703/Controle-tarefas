'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/app/utils/api';
import { X, MessageSquare, Edit, User } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import LoadingOverlay from '../LoadingOverlay';
import { Processo } from '@/app/types';

interface ModalComentariosProps {
  processoId: number;
  processo?: Processo;
  onClose: () => void;
}
export default function ModalComentarios({
  processoId,
  processo,
  onClose,
}: ModalComentariosProps) {
  // (Removido: já está sendo desestruturado na chamada abaixo)

  // ...existing code...
    // ...existing code...

  const {
    setProcessos,
    adicionarComentarioProcesso,
    atualizarProcesso,
    departamentos,
    usuarioLogado,
    mostrarConfirmacao,
  } = useSistema();

  const [comentarioAtual, setComentarioAtual] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const comentariosDoProcesso = (processo?.comentarios as any[]) || [];

  // Ao abrir o modal, busca os comentários do backend e atualiza o processo no contexto
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const comentarios = await api.getComentarios(processoId);
        if (comentarios && Array.isArray(comentarios)) {
          setProcessos(prev => prev.map(p =>
            p.id === processoId ? { ...p, comentarios } : p
          ));
        }
      } catch (err) {
        console.error('Erro ao buscar comentários:', err);
      }
    })();
    return () => { ativo = false; };
  }, [processoId, setProcessos]);
  const deptAtual = departamentos.find((d) => d.id === processo?.departamentoAtual);

  const detectarMencoes = (texto: string) => {
    const matches = texto.match(/@\w+/g);
    return matches ? Array.from(new Set(matches.map((m) => m.trim()))) : [];
  };

  const handleEnviar = async () => {
    if (!comentarioAtual.trim() || enviando) return;
    setEnviando(true);
    try {
      const mencoes = detectarMencoes(comentarioAtual);
      await adicionarComentarioProcesso(processoId, comentarioAtual.trim(), mencoes);
      setComentarioAtual('');
    } catch (err) {
      console.warn('Erro ao enviar comentário', err);
    } finally {
      setEnviando(false);
    }
  };

  const handleEditar = (comentario: any) => {
    setEditando(comentario.id);
    setTextoEditado(comentario.texto || '');
  };

  const handleSalvarEdicao = (comentarioId: number) => {
    if (!processo) return;
    (async () => {
      try {
        setEnviando(true);
        await api.atualizarComentario(comentarioId, textoEditado);
        // Recarrega o processo atualizado do backend e atualiza no contexto global
        const processoAtualizado = await api.getProcesso(processoId);
        setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
      } catch (err) {
        console.error('Erro ao salvar edição do comentário:', err);
      } finally {
        setEnviando(false);
        setEditando(null);
        setTextoEditado('');
      }
    })();
  };

  const handleCancelarEdicao = () => {
    setEditando(null);
    setTextoEditado('');
  };

  const podeExcluir = usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'gerente';

  const handleExcluir = (comentarioId: number) => {
    if (!processo) return;
    void (async () => {
      const ok = await mostrarConfirmacao({
        titulo: 'Excluir Comentário',
        mensagem: 'Tem certeza que deseja excluir este comentário?\n\nEsta ação não poderá ser desfeita.',
        tipo: 'perigo',
        textoConfirmar: 'Sim, Excluir',
        textoCancelar: 'Cancelar',
      });
      if (!ok) return;

      try {
        await api.excluirComentario(comentarioId);
        // Busca o processo atualizado do backend e atualiza no contexto global
        const processoAtualizado = await api.getProcesso(processoId);
        setProcessos(prev => prev.map(p => p.id === processoId ? processoAtualizado : p));
      } catch (err) {
        console.error('Erro ao excluir comentário:', err);
      }
    })();
  };

  const renderTextoComMencoes = (texto: string) => {
    const partes = String(texto || '').split(/(@\w+)/g);
    return partes.map((parte, idx) => {
      if (parte.startsWith('@')) {
        return (
          <span key={idx} className="bg-cyan-100 text-cyan-700 px-1 rounded font-medium">
            {parte}
          </span>
        );
      }
      return <React.Fragment key={idx}>{parte}</React.Fragment>;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        <LoadingOverlay show={enviando} text="Enviando comentário..." />
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare size={24} />
                Comentários - {(() => {
                  const nomeEmpresa = processo?.nomeEmpresa;
                  if (nomeEmpresa) return nomeEmpresa;

                  const emp = (processo as any)?.empresa;
                  if (typeof emp === 'string') return emp;
                  if (emp && typeof emp === 'object') {
                    return emp.razao_social || emp.apelido || emp.codigo || `Processo #${processoId}`;
                  }

                  return `Processo #${processoId}`;
                })()}
              </h3>
              <p className="text-white opacity-90 text-sm mt-1">
                {comentariosDoProcesso.length} comentários • Departamento: {deptAtual?.nome || '—'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {comentariosDoProcesso.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Nenhum comentário ainda</p>
              <p className="text-sm">Seja o primeiro a comentar neste processo</p>
            </div>
          ) : (
            comentariosDoProcesso.map((comentario: any) => {
              const dept = departamentos.find((d) => d.id === comentario.departamentoId);
              const ts = comentario.timestamp ? new Date(comentario.timestamp as any) : null;
              const timestampLabel = ts && !Number.isNaN(ts.getTime()) ? ts.toLocaleString('pt-BR') : '';

              return (
                <div key={comentario.id} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                          dept?.cor || 'from-gray-400 to-gray-500'
                        } flex items-center justify-center text-white font-bold`}
                      >
                        {String(comentario.autor || 'V').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{comentario.autor}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{dept?.nome || '—'}</span>
                          <span>•</span>
                          <span>{timestampLabel}</span>
                          {comentario.editado && (
                            <>
                              <span>•</span>
                              <span className="italic">Editado</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditar(comentario)}
                        className="p-2 text-cyan-600 hover:bg-cyan-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>

                      {podeExcluir && (
                        <button
                          onClick={() => handleExcluir(comentario.id)}
                          className="text-red-600 hover:text-red-700 p-2"
                          title="Excluir comentário"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editando === comentario.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={textoEditado}
                        onChange={(e) => setTextoEditado(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSalvarEdicao(comentario.id)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={handleCancelarEdicao}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {renderTextoComMencoes(comentario.texto)}
                    </div>
                  )}

                  {comentario.mencoes && comentario.mencoes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User size={12} />
                        <span>Mencionou: {comentario.mencoes.join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="space-y-3">
            <textarea
              value={comentarioAtual}
              onChange={(e) => setComentarioAtual(e.target.value)}
              placeholder="Digite seu comentário..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleEnviar();
                }
              }}
            />

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <kbd className="px-2 py-1 bg-gray-200 rounded">Ctrl</kbd> +{' '}
                <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> para enviar
              </div>

              <button
                onClick={handleEnviar}
                disabled={!comentarioAtual.trim()}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2 transition-all"
              >
                <MessageSquare size={16} />
                Enviar Comentário
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
