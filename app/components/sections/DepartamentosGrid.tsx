// app/components/sections/DepartamentosGrid.tsx
'use client';

import React, { useState } from 'react';
import { Building, User, Plus, MoreVertical, Edit, Trash2, Eye, FileText, Users, Calculator, FileCheck, Briefcase, Headphones, Scale, CheckCircle } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { useDragDrop } from '@/app/hooks/useDragDrop';
import { temPermissao } from '@/app/utils/permissions';
import { Processo } from '@/app/types';
import ProcessoCard from './ProcessoCard';

// Mapeamento de nomes de ícones para componentes
const iconMap: Record<string, any> = {
  FileText,
  Users,
  Calculator,
  FileCheck,
  Briefcase,
  Headphones,
  Scale,
  CheckCircle,
  Edit,
  Building, // fallback
};

interface DepartamentosGridProps {
  onCriarDepartamento: () => void;
  onEditarDepartamento: (dept: any) => void;
  onExcluirDepartamento: (dept: any) => void;
  onProcessoClicado: (processo: any) => void;
  onGaleria: (dept: any) => void;
}

export default function DepartamentosGrid({
  onCriarDepartamento,
  onEditarDepartamento,
  onExcluirDepartamento,
  onProcessoClicado,
  onGaleria,
}: DepartamentosGridProps) {
  const {
    departamentos,
    processos,
    usuarioLogado,
    setShowQuestionario,
    setShowUploadDocumento,
    setShowComentarios,
    setShowSelecionarTags,
    excluirProcesso,
    avancarParaProximoDepartamento,
    finalizarProcesso,
    mostrarConfirmacao,
  } = useSistema();

  const { handleDragStart, handleDragOver, handleDrop, handleDragEnd, dragState } = useDragDrop();
  const [dragOverDept, setDragOverDept] = useState<number | null>(null);
  const [menuDeptAberto, setMenuDeptAberto] = useState<number | null>(null);

  const handleQuestionario = (processo: any) => {
    setShowQuestionario({
      processoId: processo.id,
      departamento: processo.departamentoAtual,
    });
  };

  const handleDocumentos = (processo: any) => {
    setShowUploadDocumento(processo);
  };

  const handleComentarios = (processo: any) => {
    setShowComentarios(processo.id);
  };

  const handleTags = (processo: any) => {
    setShowSelecionarTags(processo);
  };

  if (departamentos.length === 0) {
    return (
      <div className="col-span-4 text-center py-12">
        <Building size={64} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Nenhum departamento criado
        </h3>
        <p className="text-gray-600 mb-6">
          Crie seu primeiro departamento para começar a gerenciar processos
        </p>
        <button
          onClick={onCriarDepartamento}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-4 rounded-xl font-medium inline-flex items-center gap-2"
        >
          <Plus size={20} />
          Criar Primeiro Departamento
        </button>
      </div>
    );
  }

  return (
    <>
      {departamentos.map((dept, index) => {
        const processosNoDept = processos.filter(
          (p) => p.departamentoAtual === dept.id && p.status === 'em_andamento'
        );

        // Usar cor configurada no departamento; fallback azul
        const corFundo = typeof dept.cor === 'string' ? dept.cor : 'from-blue-500 to-blue-600';
        const corTexto = 'text-white';

        return (
          <div key={dept.id} className="relative">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 min-h-[600px]">
              {/* Header do Departamento */}
              <div
                className={`bg-gradient-to-br ${corFundo} p-6 ${corTexto} relative overflow-visible rounded-t-2xl`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white bg-opacity-20`}>
                        {(() => {
                          let IconeComponent: any = Building; // fallback
                          
                          if (typeof dept.icone === 'string') {
                            // Se for string, busca no mapeamento
                            IconeComponent = iconMap[dept.icone] || Building;
                          } else if (typeof dept.icone === 'function') {
                            // Se for função/componente, usa diretamente
                            IconeComponent = dept.icone;
                          }
                          
                          return <IconeComponent size={20} className={corTexto} />;
                        })()}
                      </div>
                      <h3
                        className="font-bold text-lg break-words line-clamp-2 cursor-help flex-1"
                        title={dept.nome}
                      >
                        {dept.nome}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-sm opacity-95">
                      <User size={14} />
                      <span className="break-words line-clamp-1" title={dept.responsavel}>
                        {dept.responsavel || 'Sem responsável'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuDeptAberto((prev) => (prev === dept.id ? null : dept.id))}
                        className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all"
                        title="Menu"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuDeptAberto === dept.id && (
                        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuDeptAberto(null);
                              onEditarDepartamento(dept);
                            }}
                            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit size={16} className="text-gray-500" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuDeptAberto(null);
                              onExcluirDepartamento(dept);
                            }}
                            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} className="text-red-500" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onGaleria(dept)}
                      className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all"
                      title="Galeria de Documentos"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Corpo do Departamento com Processos */}
              <div 
                className={`bg-white rounded-xl p-6 min-h-[400px] transition-all duration-200 ${
                  dragOverDept === dept.id && dragState.draggedItem
                    ? 'bg-blue-50 border-2 border-blue-300'
                    : ''
                }`}
                onDragOver={(e) => {
                  handleDragOver(
                    e,
                    dragState.draggedItem,
                    dept.id
                  );
                  setDragOverDept(dept.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOverDept(null);
                }}
                onDrop={(e) => {
                  handleDrop(e, dept.id, async (processoId: number) => {
                    await avancarParaProximoDepartamento(processoId);
                  });
                  setDragOverDept(null);
                }}
              >
                <div className="space-y-4">
                  {processosNoDept.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <div className={`w-16 h-16 rounded-lg mx-auto mb-3 bg-gradient-to-br ${corFundo} flex items-center justify-center`}>
                        {(() => {
                          let IconeComponent = Building; // fallback
                          
                          if (typeof dept.icone === 'string') {
                            IconeComponent = iconMap[dept.icone] || Building;
                          } else if (typeof dept.icone === 'function') {
                            IconeComponent = dept.icone as any;
                          }
                          
                          return <IconeComponent size={24} className="text-white opacity-30" />;
                        })()}
                      </div>
                      <p className="text-base text-gray-500 font-medium">Nenhum processo</p>
                    </div>
                  ) : (
                    processosNoDept.map((processo) => {
                      // Verificar se pode arrastar este processo
                      const podeArrastar = temPermissao(usuarioLogado, 'mover_processo', { 
                        departamentoOrigemId: dept.id,
                        departamentoAtual: dept.id
                      });
                      
                      return (
                      <div
                        key={processo.id}
                        draggable={podeArrastar}
                        onDragStart={(e) => handleDragStart(e, processo, dept.id)}
                        onDragEnd={handleDragEnd}
                        className={`${podeArrastar ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-75'} transition-all ${
                          dragState.draggedItem?.id === processo.id
                            ? 'opacity-50'
                            : ''
                        }`}
                        title={podeArrastar ? 'Arraste para mover' : 'Apenas gerentes podem mover processos'}
                      >
                        <ProcessoCard
                          processo={processo}
                          departamento={dept}
                          onQuestionario={handleQuestionario}
                          onDocumentos={handleDocumentos}
                          onComentarios={handleComentarios}
                          onTags={handleTags}
                          onExcluir={async (id: number) => {
                            const ok = await mostrarConfirmacao({
                              titulo: 'Excluir Processo',
                              mensagem: 'Tem certeza que deseja excluir este processo?\n\nEssa ação não poderá ser desfeita.',
                              tipo: 'perigo',
                              textoConfirmar: 'Sim, Excluir',
                              textoCancelar: 'Cancelar',
                            });
                            if (ok) excluirProcesso(id);
                          }}
                          onAvancar={(id: number) => {
                            avancarParaProximoDepartamento(id);
                            return Promise.resolve();
                          }}
                          onFinalizar={(id: number) => {
                            finalizarProcesso(id);
                            return Promise.resolve();
                          }}
                          onVerDetalhes={onProcessoClicado}
                        />
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}