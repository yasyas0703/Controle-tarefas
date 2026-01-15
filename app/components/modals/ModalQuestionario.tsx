'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface Pergunta {
  id: string;
  texto: string;
  tipo: 'texto' | 'selecao' | 'checkbox';
  opcoes?: string[];
  obrigatoria: boolean;
}

interface ModalQuestionarioProps {
  onClose: () => void;
  onSave: (perguntas: Pergunta[]) => void;
  perguntasIniciais?: Pergunta[];
}

export default function ModalQuestionario({
  onClose,
  onSave,
  perguntasIniciais = [],
}: ModalQuestionarioProps) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>(perguntasIniciais);
  const [novapergunta, setNovapergunta] = useState({
    texto: '',
    tipo: 'texto' as const,
    opcoes: '',
    obrigatoria: false,
  });

  const handleAdicionarPergunta = () => {
    if (novapergunta.texto) {
      const opcoes =
        novapergunta.tipo !== 'texto' ? novapergunta.opcoes.split(',').map((o) => o.trim()) : [];

      setPerguntas([
        ...perguntas,
        {
          id: Date.now().toString(),
          texto: novapergunta.texto,
          tipo: novapergunta.tipo,
          opcoes: opcoes.length > 0 ? opcoes : undefined,
          obrigatoria: novapergunta.obrigatoria,
        },
      ]);

      setNovapergunta({
        texto: '',
        tipo: 'texto',
        opcoes: '',
        obrigatoria: false,
      });
    }
  };

  const handleRemoverPergunta = (id: string) => {
    setPerguntas(perguntas.filter((p) => p.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Criar Questionário</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Adicionar Nova Pergunta */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Adicionar Pergunta</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pergunta *
              </label>
              <textarea
                value={novapergunta.texto}
                onChange={(e) => setNovapergunta({ ...novapergunta, texto: e.target.value.slice(0, 200) })}
                maxLength={200}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                rows={2}
                placeholder="Digite a pergunta... (máx. 200 caracteres)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={novapergunta.tipo}
                  onChange={(e) => setNovapergunta({ ...novapergunta, tipo: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="texto">Texto</option>
                  <option value="selecao">Seleção</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novapergunta.obrigatoria}
                    onChange={(e) =>
                      setNovapergunta({ ...novapergunta, obrigatoria: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Obrigatória</span>
                </label>
              </div>
            </div>

            {novapergunta.tipo !== 'texto' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opções (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={novapergunta.opcoes}
                  onChange={(e) => setNovapergunta({ ...novapergunta, opcoes: e.target.value.slice(0, 200) })}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Opção 1, Opção 2, Opção 3 (máx. 200 caracteres)"
                />
              </div>
            )}

            <button
              onClick={handleAdicionarPergunta}
              className="w-full bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={18} />
              Adicionar Pergunta
            </button>
          </div>

          {/* Lista de Perguntas */}
          {perguntas.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">
                Perguntas ({perguntas.length})
              </h3>
              {perguntas.map((pergunta, index) => (
                <div
                  key={pergunta.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {index + 1}. {pergunta.texto}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tipo: {pergunta.tipo} {pergunta.obrigatoria && '| Obrigatória'}
                      </p>
                      {pergunta.opcoes && (
                        <p className="text-xs text-gray-600 mt-1">
                          Opções: {pergunta.opcoes.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoverPergunta(pergunta.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(perguntas)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Salvar Questionário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
