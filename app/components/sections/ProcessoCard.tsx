'use client';

import React from 'react';
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  FileText,
  MessageSquare,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { Processo } from '@/app/types';
import { useSistema } from '@/app/context/SistemaContext';
import { formatarData } from '@/app/utils/helpers';
import { temPermissao as temPermissaoSistema } from '@/app/utils/permissions';

interface ProcessoCardProps {
  processo: Processo;
  departamento: any;
  onQuestionario: (processo: Processo) => void;
  onDocumentos: (processo: Processo) => void;
  onComentarios: (processo: Processo) => void;
  onTags: (processo: Processo) => void;
  onExcluir: (id: number) => Promise<void>;
  onAvancar: (id: number) => Promise<void>;
  onFinalizar: (id: number) => Promise<void>;
  onVerDetalhes: (processo: Processo) => void;
  onDragStart?: (e: React.DragEvent, processo: Processo) => void;
}

export default function ProcessoCard({
  processo,
  departamento,
  onQuestionario,
  onDocumentos,
  onComentarios,
  onTags,
  onExcluir,
  onAvancar,
  onFinalizar,
  onVerDetalhes,
  onDragStart,
}: ProcessoCardProps) {
  const { tags, atualizarProcesso, usuarioLogado } = useSistema();

  const departamentoUsuario =
    typeof (usuarioLogado as any)?.departamentoId === 'number'
      ? (usuarioLogado as any).departamentoId
      : typeof (usuarioLogado as any)?.departamento_id === 'number'
        ? (usuarioLogado as any).departamento_id
        : undefined;

  const isDeptDoUsuario =
    typeof departamentoUsuario === 'number' &&
    typeof processo?.departamentoAtual === 'number' &&
    processo.departamentoAtual === departamentoUsuario;

  // Usuário normal: só mostra ações no card do próprio departamento
  const podeExibirAcoesNoCard = usuarioLogado?.role !== 'usuario' || isDeptDoUsuario;

  const podeEditarProcesso = temPermissaoSistema(usuarioLogado, 'editar_processo', { departamentoAtual: processo.departamentoAtual });
  const podeExcluirProcesso = temPermissaoSistema(usuarioLogado, 'excluir_processo', { departamentoAtual: processo.departamentoAtual });
  const podeMover = temPermissaoSistema(usuarioLogado, 'mover_processo', { departamentoAtual: processo.departamentoAtual });

  const podeAcessarTags =
    podeExibirAcoesNoCard &&
    (temPermissaoSistema(usuarioLogado, 'gerenciar_tags', { departamentoAtual: processo.departamentoAtual }) ||
      temPermissaoSistema(usuarioLogado, 'aplicar_tags', { departamentoAtual: processo.departamentoAtual }));

  const podeComentar =
    podeExibirAcoesNoCard &&
    temPermissaoSistema(usuarioLogado, 'comentar', { departamentoAtual: processo.departamentoAtual });

  const getPriorityColor = (prioridade: string) => {
    switch ((prioridade || '').toLowerCase()) {
      case 'alta':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'media':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'baixa':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const prioridade = (processo.prioridade || 'media') as 'alta' | 'media' | 'baixa';
  const statusLabel = processo.status === 'finalizado' ? 'Finalizado' : 'Em Andamento';

  const fluxo = processo.fluxoDepartamentos || [];
  const idxAtual = processo.departamentoAtualIndex || 0;
  const isUltimo = fluxo.length > 0 ? idxAtual === fluxo.length - 1 : false;

  const podeFinalizar = temPermissaoSistema(usuarioLogado, 'finalizar_processo', {
    departamentoAtual: processo.departamentoAtual,
    isUltimoDepartamento: isUltimo,
  });

  const progresso =
    typeof processo.progresso === 'number'
      ? processo.progresso
      : fluxo.length > 0
        ? Math.round(((idxAtual + 1) / fluxo.length) * 100)
        : 0;

  return (
    <div
      className="bg-gray-50 rounded-xl p-4 cursor-move hover:bg-gray-100 transition-all duration-200 hover:shadow-md border border-gray-200"
      onClick={() => onVerDetalhes(processo)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-2">
          {processo.nomeServico && (
            <div
              className="text-medium font-semibold text-blue-600 mb-1 leading-tight truncate cursor-help"
              title={processo.nomeServico}
            >
              {processo.nomeServico}
            </div>
          )}

          <div className="flex items-center gap-1 mb-0.5">
            <div
              className="font-base text-sm text-gray-700 truncate flex-1 cursor-help"
              title={processo.nomeEmpresa}
            >
              {processo.nomeEmpresa || 'Nova Empresa'}
            </div>

            {(processo.tags || []).length > 0 && (
              <div className="flex gap-1 flex-shrink-0">
                {(processo.tags || []).map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return tag ? (
                    <div
                      key={tagId}
                      className={`w-2 h-2 rounded-full ${tag.cor} border border-white shadow-sm`}
                      title={tag.nome}
                    />
                  ) : null;
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-600 truncate cursor-help" title={processo.cliente}>
            {processo.cliente || 'Sem responsável'}
          </p>
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {podeAcessarTags && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTags(processo);
              }}
              className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-xs hover:bg-indigo-200 transition-colors flex items-center gap-1 flex-shrink-0"
              title="Tags"
            >
              <Star size={10} />
              {(processo.tags || []).length > 0 && (
                <span className="bg-indigo-500 text-white rounded-full w-3 h-3 text-[10px] flex items-center justify-center flex-shrink-0">
                  {(processo.tags || []).length}
                </span>
              )}
            </button>
          )}

          {podeComentar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComentarios(processo);
              }}
              className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs hover:bg-purple-200 transition-colors flex items-center gap-1 flex-shrink-0"
              title="Comentários"
            >
              <MessageSquare size={10} />
              {(((processo as any).comentariosCount ?? (processo.comentarios || []).length) as number) > 0 && (
                <span className="text-[10px]">({(processo as any).comentariosCount ?? (processo.comentarios || []).length})</span>
              )}
            </button>
          )}

          {podeExcluirProcesso && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                void onExcluir(processo.id);
              }}
              className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200 transition-colors flex items-center gap-1 flex-shrink-0"
              title="Excluir processo"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="relative">
          {podeEditarProcesso ? (
            <>
              <select
                value={prioridade}
                onChange={(e) => {
                  e.stopPropagation();
                  atualizarProcesso(processo.id, { prioridade: e.target.value as any });
                }}
                className={`text-xs px-3 py-1 rounded-full border cursor-pointer appearance-none pr-8 ${getPriorityColor(
                  prioridade
                )}`}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="baixa" className="text-green-600 bg-white">
                  BAIXA
                </option>
                <option value="media" className="text-yellow-600 bg-white">
                  MEDIA
                </option>
                <option value="alta" className="text-red-600 bg-white">
                  ALTA
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown size={12} />
              </div>
            </>
          ) : (
            <span className={`text-xs px-3 py-1 rounded-full border ${getPriorityColor(prioridade)}`}>{prioridade.toUpperCase()}</span>
          )}
        </div>

        <span className="text-xs text-gray-500">{statusLabel}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div
          className={`bg-gradient-to-r ${departamento?.cor || 'from-cyan-500 to-blue-600'} h-1.5 rounded-full transition-all duration-300`}
          style={{ width: `${progresso}%` }}
        ></div>
      </div>

      <p className="text-xs text-gray-500">Desde: {formatarData((processo.dataInicio || processo.criadoEm) as any)}</p>

      <div className="grid grid-cols-2 gap-1 mt-3">
        {processo.status === 'em_andamento' && (
          <>
            {podeExibirAcoesNoCard && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuestionario(processo);
                  }}
                  className="w-full bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                  title="Abrir Questionário"
                >
                  <FileText size={10} />
                  Form
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentos(processo);
                  }}
                  className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                  title="Upload de Documentos"
                >
                  <Upload size={10} />
                  Docs
                </button>
              </>
            )}

            {podeExibirAcoesNoCard && podeMover && (
              <>
                {fluxo.length > 0 && idxAtual < fluxo.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void onAvancar(processo.id);
                    }}
                    className="col-span-2 w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-2 py-1 rounded text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowRight size={10} />
                    Avançar ({idxAtual + 1}/{fluxo.length})
                  </button>
                )}

                {fluxo.length > 0 && isUltimo && podeFinalizar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void onFinalizar(processo.id);
                    }}
                    className="col-span-2 w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white px-2 py-1 rounded text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle size={10} />
                    Finalizar
                  </button>
                )}
              </>
            )}
          </>
        )}

        {processo.status === 'finalizado' && (
          <div className="col-span-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs text-center flex items-center justify-center gap-2">
            <CheckCircle size={14} />
            <span className="font-medium">Processo Finalizado</span>
          </div>
        )}

        <div className="mt-3"></div>
      </div>
    </div>
  );
}