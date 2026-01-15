'use client';

import React from 'react';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import LoadingOverlay from '../LoadingOverlay';
import type { Questionario } from '@/app/types';
import { api } from '@/app/utils/api';

interface ModalEditarQuestionarioSolicitacaoProps {
  processoId: number;
  departamentoId: number;
  onClose: () => void;
}

const TIPOS_CAMPO: Array<{ valor: Questionario['tipo']; label: string }> = [
  { valor: 'text', label: 'Texto Simples' },
  { valor: 'textarea', label: 'Texto Longo' },
  { valor: 'number', label: 'Número' },
  { valor: 'date', label: 'Data' },
  { valor: 'boolean', label: 'Sim/Não' },
  { valor: 'select', label: 'Seleção Única' },
  { valor: 'file', label: 'Arquivo/Anexo' },
  { valor: 'phone', label: 'Telefone' },
  { valor: 'email', label: 'Email' },
];

export default function ModalEditarQuestionarioSolicitacao({
  processoId,
  departamentoId,
  onClose,
}: ModalEditarQuestionarioSolicitacaoProps) {
  const { processos, departamentos, setProcessos, mostrarAlerta, adicionarNotificacao } = useSistema();

  const processo = processos.find((p) => p.id === processoId);
  const departamento = departamentos.find((d) => d.id === departamentoId);

  const perguntasIniciais = React.useMemo<Questionario[]>(() => {
    const base = (processo?.questionariosPorDepartamento || {}) as any;
    const porNumero = base?.[departamentoId];
    const porString = base?.[String(departamentoId)];
    const arr = (Array.isArray(porNumero) ? porNumero : Array.isArray(porString) ? porString : []) as Questionario[];
    return arr.map((q, idx) => ({ ...q, ordem: q.ordem ?? idx + 1 }));
  }, [processo, departamentoId]);

  const [perguntas, setPerguntas] = React.useState<Questionario[]>(perguntasIniciais);
  const [editando, setEditando] = React.useState<Questionario | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setPerguntas(perguntasIniciais);
  }, [perguntasIniciais]);

  const iniciarNovaPergunta = (tipo: Questionario['tipo']) => {
    setEditando({
      id: Date.now(),
      label: '',
      tipo,
      obrigatorio: false,
      opcoes: tipo === 'select' ? [''] : undefined,
      ordem: perguntas.length + 1,
    });
  };

  const salvarPergunta = () => {
    if (!editando) return;
    if (!String(editando.label || '').trim()) {
      void mostrarAlerta('Atenção', 'Digite o texto da pergunta!', 'aviso');
      return;
    }

    const normalizada: Questionario = {
      ...editando,
      opcoes:
        editando.tipo === 'select'
          ? (editando.opcoes || []).map((o) => String(o || '').trim()).filter(Boolean)
          : undefined,
    };

    setPerguntas((prev) => {
      const existe = prev.some((p) => p.id === normalizada.id);
      const next = existe ? prev.map((p) => (p.id === normalizada.id ? normalizada : p)) : [...prev, normalizada];
      return next
        .map((p, idx) => ({ ...p, ordem: idx + 1 }))
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    });

    setEditando(null);
  };

  const excluirPergunta = (id: number) => {
    setPerguntas((prev) => prev.filter((p) => p.id !== id).map((p, idx) => ({ ...p, ordem: idx + 1 })));
  };

  const salvarAlteracoes = () => {
    if (!processo) {
      void mostrarAlerta('Erro', 'Processo não encontrado.', 'erro');
      return;
    }

    void (async () => {
      try {
        setSaving(true);
        await api.salvarQuestionariosProcesso(
          processoId,
          departamentoId,
          perguntas.map((p, idx) => ({ ...p, ordem: idx + 1 })) as any
        );
        // Recarrega o processo completo para refletir em todos os lugares (cards, ver completo, etc.)
        const atualizado = await api.getProcesso(processoId);
        setProcessos((prev: any) => (Array.isArray(prev) ? prev.map((x: any) => (x?.id === processoId ? atualizado : x)) : prev));
        adicionarNotificacao('Questionário atualizado com sucesso', 'sucesso');
        onClose();
      } catch (e: any) {
        void mostrarAlerta('Erro', e?.message || 'Erro ao salvar questionário', 'erro');
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[10025] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <LoadingOverlay show={saving} text="Salvando questionário..." />
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">Editar Quest.</h3>
              <p className="text-white opacity-90 text-sm mt-1">
                {(() => {
                  const nomeEmpresa = processo?.nomeEmpresa;
                  if (nomeEmpresa) return nomeEmpresa;

                  const emp = (processo as any)?.empresa;
                  if (typeof emp === 'string') return emp;
                  if (emp && typeof emp === 'object') {
                    return emp.razao_social || emp.apelido || emp.codigo || 'Processo';
                  }

                  return 'Processo';
                })()}
                {departamento?.nome ? ` • ${departamento.nome}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Ações: adicionar pergunta */}
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <h4 className="font-semibold text-orange-800 mb-3">Adicionar Pergunta</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TIPOS_CAMPO.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => iniciarNovaPergunta(t.valor)}
                  className="px-3 py-2 rounded-lg border-2 border-orange-200 hover:border-orange-400 hover:bg-white transition-all font-medium text-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus size={14} />
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          {editando && (
            <div className="border-2 border-orange-300 rounded-xl p-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pergunta *</label>
                  <input
                    type="text"
                    value={editando.label}
                    onChange={(e) => setEditando({ ...editando, label: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    placeholder="Digite o texto da pergunta..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
                  <select
                    value={editando.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value as Questionario['tipo'];
                      setEditando({
                        ...editando,
                        tipo,
                        opcoes: tipo === 'select' ? editando.opcoes || [''] : undefined,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  >
                    {TIPOS_CAMPO.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editando.obrigatorio)}
                      onChange={(e) => setEditando({ ...editando, obrigatorio: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Obrigatória</span>
                  </label>
                </div>

                {editando.tipo === 'select' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Opções</label>
                    <div className="space-y-2">
                      {(editando.opcoes || ['']).map((op, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={op}
                            onChange={(e) => {
                              const next = [...(editando.opcoes || [])];
                              next[idx] = e.target.value;
                              setEditando({ ...editando, opcoes: next });
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder={`Opção ${idx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = (editando.opcoes || []).filter((_, i) => i !== idx);
                              setEditando({ ...editando, opcoes: next.length > 0 ? next : [''] });
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remover opção"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setEditando({ ...editando, opcoes: [...(editando.opcoes || []), ''] })}
                        className="w-full px-4 py-2 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 text-orange-700 font-medium"
                      >
                        + Adicionar Opção
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarPergunta}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar Pergunta
                </button>
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Perguntas ({perguntas.length})</h4>
            {perguntas.length === 0 ? (
              <div className="text-sm text-gray-600">Nenhuma pergunta neste departamento.</div>
            ) : (
              <div className="space-y-2">
                {perguntas
                  .slice()
                  .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                  .map((p, idx) => (
                    <div key={p.id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate" title={p.label}>
                          {idx + 1}. {p.label}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Tipo: {p.tipo} {p.obrigatorio ? '• Obrigatória' : ''}
                        </div>
                        {p.tipo === 'select' && p.opcoes && p.opcoes.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1 truncate" title={p.opcoes.join(', ')}>
                            Opções: {p.opcoes.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditando({ ...p, opcoes: p.opcoes || (p.tipo === 'select' ? [''] : undefined) })}
                          className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirPergunta(p.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="Excluir pergunta"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={salvarAlteracoes}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
