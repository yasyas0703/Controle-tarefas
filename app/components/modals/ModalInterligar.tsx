'use client';

import React, { useState } from 'react';
import { Link2, X, ArrowRight } from 'lucide-react';
import ModalBase from './ModalBase';

interface ModalInterligarProps {
  processoNome: string;
  processoId: number;
  templates: Array<{ id: number; nome: string; descricao?: string }>;
  onConfirmar: (templateId: number, deptIndependente: boolean, interligarComId?: number | null, interligarParalelo?: boolean) => void;
  onPular: () => void;
  onClose: () => void;
}

export default function ModalInterligar({
  processoNome,
  processoId,
  templates,
  onConfirmar,
  onPular,
  onClose,
}: ModalInterligarProps) {
  const [templateSelecionado, setTemplateSelecionado] = useState<number | null>(null);
  const [paralelo, setParalelo] = useState(false);
  const [interligarCom, setInterligarCom] = useState<number | null>(null);
  const [interligarParalelo, setInterligarParalelo] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirmar = async () => {
    if (!templateSelecionado) return;
    setLoading(true);
    try {
      await onConfirmar(templateSelecionado, paralelo, interligarCom, interligarParalelo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      isOpen
      onClose={onClose}
      labelledBy="interligar-title"
      dialogClassName="w-full max-w-lg bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
      zIndex={1200}
    >
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="interligar-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Interligar Solicitação
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Processo #{processoId} finalizado
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <ArrowRight className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
              A solicitação &quot;{processoNome}&quot; foi finalizada com sucesso!
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
              Deseja interligar com outra solicitação? O histórico será compartilhado e a próxima solicitação será criada automaticamente.
            </p>
          </div>
        </div>

        {/* Seleção do template */}
        {templates.length > 0 ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Selecione a atividade para continuar:
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${templateSelecionado === template.id
                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                >
                  <input
                    type="radio"
                    name="template-interligar"
                    value={template.id}
                    checked={templateSelecionado === template.id}
                    onChange={() => setTemplateSelecionado(template.id)}
                    className="text-purple-500 focus:ring-purple-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block truncate">
                      {template.nome}
                    </span>
                    {template.descricao && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                        {template.descricao}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma atividade/template disponível para interligar.
          </p>
        )}

        {/* Departamentos paralelos */}
        {templateSelecionado && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={paralelo}
                onChange={(e) => setParalelo(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                  ⚡ Departamentos trabalham em paralelo
                </span>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Ative se a solicitação interligada deve ter departamentos independentes.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Interligar continuação com outra atividade */}
        {templateSelecionado && templates.filter(t => t.id !== templateSelecionado).length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Link2 className="inline w-4 h-4 mr-1" />
              Interligar continuação com outra atividade <span className="text-gray-400 text-xs font-normal">(opcional)</span>
            </label>
            <select
              value={interligarCom || ''}
              onChange={(e) => {
                setInterligarCom(e.target.value ? Number(e.target.value) : null);
                if (!e.target.value) setInterligarParalelo(false);
              }}
              className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg focus:ring-2 focus:ring-purple-500 bg-purple-50 dark:bg-purple-900/20 text-gray-900 dark:text-[var(--fg)] text-sm"
            >
              <option value="">Nenhuma (solicitação independente)</option>
              {templates
                .filter(t => t.id !== templateSelecionado)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome}{t.descricao ? ` — ${t.descricao}` : ''}
                  </option>
                ))}
            </select>
            {interligarCom && (
              <>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  🔗 Ao finalizar esta continuação, a atividade selecionada será criada automaticamente.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interligarParalelo}
                    onChange={(e) => setInterligarParalelo(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    ⚡ Solicitação interligada com departamentos em paralelo
                  </span>
                </label>
              </>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => { onPular(); onClose(); }}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Não interligar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!templateSelecionado || loading}
            className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            {loading ? 'Interligando...' : 'Interligar e Continuar'}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
