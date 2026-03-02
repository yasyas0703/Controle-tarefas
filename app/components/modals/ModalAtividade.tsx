'use client';

import React, { useState } from 'react';
import { X, ArrowRight, Edit, Plus, ClipboardList, Save, Workflow, Trash2 } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import ModalBase from './ModalBase';
import LoadingOverlay from '../LoadingOverlay';

interface ModalAtividadeProps {
  onClose: () => void;
  templateToEdit?: any; // Template being edited (will be saved as a copy)
}

/**
 * Modal "Atividade" - Substitui o antigo "Personalizada".
 * 
 * Aqui o usuário cria APENAS o questionário por departamento e define o fluxo.
 * NÃO tem empresa, responsável nem data.
 * 
 * Ao criar, vira um "Fluxo" salvo que pode ser usado como template  
 * em "Nova Solicitação" (onde aí sim terá empresa, responsável e data).
 */
export default function ModalAtividade({ onClose, templateToEdit }: ModalAtividadeProps) {
  const { departamentos, usuarioLogado, criarTemplate, mostrarAlerta, templates } = useSistema();

  // Parse template data for editing
  const parseTemplateData = (tmpl: any) => {
    if (!tmpl) return { nome: '', descricao: '', fluxo: [] as number[], qpd: {} as any };
    const fluxoRaw = tmpl.fluxoDepartamentos ?? tmpl.fluxo_departamentos;
    let fluxo: number[] = [];
    if (Array.isArray(fluxoRaw)) {
      fluxo = fluxoRaw.map(Number);
    } else if (typeof fluxoRaw === 'string') {
      try { fluxo = JSON.parse(fluxoRaw).map(Number); } catch { fluxo = []; }
    }
    const qpdRaw = tmpl.questionariosPorDepartamento ?? tmpl.questionarios_por_departamento;
    let qpd: any = {};
    if (qpdRaw && typeof qpdRaw === 'object' && !Array.isArray(qpdRaw)) {
      qpd = qpdRaw;
    } else if (typeof qpdRaw === 'string') {
      try { qpd = JSON.parse(qpdRaw); } catch { qpd = {}; }
    }
    // Ensure all qpd values have proper IDs
    for (const key of Object.keys(qpd)) {
      qpd[key] = (qpd[key] || []).map((p: any, idx: number) => ({
        ...p,
        id: p.id || Date.now() + idx,
      }));
    }
    return {
      nome: (tmpl.nome || '') + ' (cópia)',
      descricao: tmpl.descricao || '',
      fluxo,
      qpd,
    };
  };

  const editData = parseTemplateData(templateToEdit);

  const [nomeAtividade, setNomeAtividade] = useState(editData.nome);
  const [descricao, setDescricao] = useState(editData.descricao);
  const [questionariosPorDept, setQuestionariosPorDept] = useState<any>(editData.qpd);
  const [departamentoSelecionado, setDepartamentoSelecionado] = useState<number | null>(null);
  const [editandoPergunta, setEditandoPergunta] = useState<any>(null);
  const [fluxoDepartamentos, setFluxoDepartamentos] = useState<number[]>(editData.fluxo);
  const [loading, setLoading] = useState(false);

  const tiposCampo = [
    { valor: 'text', label: 'Texto Simples' },
    { valor: 'textarea', label: 'Texto Longo' },
    { valor: 'number', label: 'Número' },
    { valor: 'date', label: 'Data' },
    { valor: 'boolean', label: 'Sim/Não' },
    { valor: 'select', label: 'Seleção Única' },
    { valor: 'checkbox', label: 'Checklist' },
    { valor: 'file', label: 'Arquivo/Anexo' },
    { valor: 'phone', label: 'Telefone' },
    { valor: 'email', label: 'Email' },
    { valor: 'cpf', label: 'CPF' },
    { valor: 'cnpj', label: 'CNPJ' },
    { valor: 'cep', label: 'CEP' },
    { valor: 'money', label: 'Valor (R$)' },
    { valor: 'grupo_repetivel', label: 'Grupo Repetível' },
  ];

  const adicionarDepartamentoAoFluxo = (deptId: number) => {
    if (!fluxoDepartamentos.includes(deptId)) {
      setFluxoDepartamentos([...fluxoDepartamentos, deptId]);
      setQuestionariosPorDept({
        ...questionariosPorDept,
        [deptId]: [],
      });
    }
    setDepartamentoSelecionado(deptId);
  };

  const removerDepartamentoDoFluxo = (deptId: number) => {
    setFluxoDepartamentos(fluxoDepartamentos.filter((id) => id !== deptId));
    const novosQuestionarios = { ...questionariosPorDept };
    delete novosQuestionarios[deptId];
    setQuestionariosPorDept(novosQuestionarios);
    if (departamentoSelecionado === deptId) setDepartamentoSelecionado(null);
  };

  const adicionarPergunta = (tipo: string) => {
    if (departamentoSelecionado == null) {
      void mostrarAlerta('Atenção', 'Selecione um departamento antes de adicionar perguntas!', 'aviso');
      return;
    }
    const novaPergunta = {
      id: Date.now(),
      label: '',
      tipo,
      obrigatorio: false,
      opcoes: tipo === 'select' || tipo === 'checkbox' ? [''] : [],
      ordem: (questionariosPorDept[departamentoSelecionado]?.length || 0) + 1,
      condicao: null,
      ...(tipo === 'grupo_repetivel' ? {
        modoRepeticao: 'manual',
        subPerguntas: [],
      } : {}),
    };
    setEditandoPergunta(novaPergunta);
  };

  const salvarPergunta = () => {
    if (!editandoPergunta.label.trim()) {
      void mostrarAlerta('Atenção', 'Digite o texto da pergunta!', 'aviso');
      return;
    }
    const perguntasDepto = departamentoSelecionado !== null ? questionariosPorDept[departamentoSelecionado] || [] : [];
    if (departamentoSelecionado !== null && perguntasDepto.find((p: any) => p.id === editandoPergunta.id)) {
      setQuestionariosPorDept({
        ...questionariosPorDept,
        [departamentoSelecionado]: perguntasDepto.map((p: any) =>
          p.id === editandoPergunta.id ? editandoPergunta : p
        ),
      });
    } else if (departamentoSelecionado !== null) {
      setQuestionariosPorDept({
        ...questionariosPorDept,
        [departamentoSelecionado]: [...perguntasDepto, editandoPergunta],
      });
    }
    setEditandoPergunta(null);
  };

  const excluirPergunta = (perguntaId: number) => {
    if (departamentoSelecionado !== null) {
      setQuestionariosPorDept({
        ...questionariosPorDept,
        [departamentoSelecionado]: questionariosPorDept[departamentoSelecionado].filter(
          (p: any) => p.id !== perguntaId
        ),
      });
    }
  };

  const adicionarOpcao = () => {
    setEditandoPergunta({
      ...editandoPergunta,
      opcoes: [...editandoPergunta.opcoes, ''],
    });
  };

  const atualizarOpcao = (index: number, valor: string) => {
    const novasOpcoes = [...editandoPergunta.opcoes];
    novasOpcoes[index] = valor;
    setEditandoPergunta({ ...editandoPergunta, opcoes: novasOpcoes });
  };

  const removerOpcao = (index: number) => {
    setEditandoPergunta({
      ...editandoPergunta,
      opcoes: editandoPergunta.opcoes.filter((_: any, i: number) => i !== index),
    });
  };

  const handleSalvarComoFluxo = async () => {
    if (!nomeAtividade.trim()) {
      void mostrarAlerta('Atenção', 'Digite o nome da atividade!', 'aviso');
      return;
    }

    // Verificação de nome duplicado
    const nomeNorm = nomeAtividade.trim().toLowerCase();
    const duplicado = (templates || []).some(
      (t) => t.nome.trim().toLowerCase() === nomeNorm
    );
    if (duplicado) {
      void mostrarAlerta('Nome duplicado', `Já existe uma atividade/template com o nome "${nomeAtividade.trim()}". Escolha um nome diferente.`, 'aviso');
      return;
    }

    if (fluxoDepartamentos.length === 0) {
      void mostrarAlerta('Atenção', 'Adicione pelo menos um departamento ao fluxo!', 'aviso');
      return;
    }

    // Validação: cada dept deve ter pelo menos 1 pergunta
    const missingDeptIds = fluxoDepartamentos.filter((deptId) => {
      const qs = questionariosPorDept[deptId] ?? questionariosPorDept[String(deptId)];
      return !Array.isArray(qs) || qs.length === 0;
    });

    if (missingDeptIds.length > 0) {
      const nomes = missingDeptIds
        .map((id) => departamentos.find((d) => d.id === id)?.nome || `#${id}`)
        .join(', ');
      void mostrarAlerta('Questionários faltando', `Departamentos sem questionário: ${nomes}`, 'aviso');
      return;
    }

    try {
      setLoading(true);
      await criarTemplate({
        nome: nomeAtividade.trim(),
        descricao: descricao.trim() || `Atividade: ${nomeAtividade.trim()}`,
        fluxoDepartamentos,
        questionariosPorDepartamento: {
          ...questionariosPorDept,
        },
      });
      void mostrarAlerta('Sucesso!', 'Atividade salva como Fluxo! Agora ela aparece em "Nova Solicitação" para ser usada com empresa, responsável e prazo.', 'sucesso');
      onClose();
    } catch (error: any) {
      void mostrarAlerta('Erro', error.message || 'Erro ao salvar atividade', 'erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      isOpen
      onClose={onClose}
      labelledBy="atividade-title"
      dialogClassName="w-full max-w-6xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
      zIndex={1050}
    >
      <div className="rounded-2xl relative">
        <LoadingOverlay show={loading} text="Salvando atividade..." />

        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 id="atividade-title" className="text-xl font-bold text-white flex items-center gap-2">
                <Workflow size={22} /> Nova Atividade
              </h3>
              <p className="text-white/80 text-sm mt-1">
                Crie o questionário e defina o fluxo. Depois salve como template para usar em &ldquo;Nova Solicitação&rdquo;.
              </p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Nome e descrição */}
          <div className="bg-cyan-50 dark:bg-[#0f2b34] rounded-xl p-4 border border-cyan-200 dark:border-[#155e75]">
            <h4 className="font-semibold text-cyan-800 mb-4 flex items-center gap-2">
              <ClipboardList size={18} /> Informações da Atividade
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome da Atividade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomeAtividade}
                  onChange={(e) => setNomeAtividade(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[var(--border)] rounded-xl focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                  placeholder="Ex: Abertura de Empresa, Alteração Contratual..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[var(--border)] rounded-xl focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                  placeholder="Descreva brevemente a atividade..."
                  rows={2}
                />
              </div>


            </div>
          </div>

          {/* Questionários por departamento */}
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-4">
              Criar Questionários por Departamento
            </h4>

            <div className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 mb-3">
                Adicionar Departamentos ao Fluxo:
              </h5>
              <div className="flex flex-wrap gap-2">
                {departamentos.map((dept: any) => {
                  const jaAdicionado = fluxoDepartamentos.includes(dept.id);
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() =>
                        jaAdicionado
                          ? removerDepartamentoDoFluxo(dept.id)
                          : adicionarDepartamentoAoFluxo(dept.id)
                      }
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium ${
                        jaAdicionado
                          ? 'bg-blue-600 text-white'
                          : 'border-2 border-gray-300 hover:border-purple-500 text-gray-700'
                      }`}
                    >
                      <ClipboardList size={16} /> {dept.nome}
                      {jaAdicionado && (
                        <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs">
                          {questionariosPorDept[dept.id]?.length || 0} perguntas
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fluxo Visual com badges de ordem */}
            {fluxoDepartamentos.length > 0 && (
              <div className="mb-6 bg-white rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  Fluxo da Atividade ({fluxoDepartamentos.length} departamentos):
                </h5>
                <div className="flex flex-wrap items-center gap-2">
                  {fluxoDepartamentos.map((deptId, index) => {
                    const dept = departamentos.find((d: any) => d.id === deptId);
                    if (!dept) return null;
                    return (
                      <React.Fragment key={deptId}>
                        <button
                          type="button"
                          onClick={() => setDepartamentoSelecionado(deptId)}
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-all relative ${
                            departamentoSelecionado === deptId
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {/* Badge de ordem */}
                          <span className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            departamentoSelecionado === deptId ? 'bg-yellow-400 text-gray-900' : 'bg-blue-500 text-white'
                          }`}>
                            {index + 1}
                          </span>
                          <ClipboardList size={16} className="ml-3" /> {dept.nome}
                        </button>
                        {index < fluxoDepartamentos.length - 1 && (
                          <ArrowRight size={16} className="text-gray-400" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Editor de Questionário */}
            {departamentoSelecionado && (
              <div className="border-2 border-purple-300 rounded-xl p-4 bg-white">
                {(() => {
                  const dept = departamentos.find((d: any) => d.id === departamentoSelecionado);
                  const perguntasDepto = questionariosPorDept[departamentoSelecionado] || [];

                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-800 flex items-center gap-2">
                          📋 Questionário - {dept?.nome}
                        </h5>
                        <span className="text-sm text-gray-600">
                          {perguntasDepto.length} pergunta(s)
                        </span>
                      </div>

                      {!editandoPergunta && (
                        <div className="mb-4">
                          <h6 className="text-sm font-medium text-gray-700 mb-2">
                            Adicionar Pergunta:
                          </h6>
                          <div className="grid grid-cols-3 gap-2">
                            {tiposCampo.map((tipo) => (
                              <button
                                key={tipo.valor}
                                type="button"
                                onClick={() => adicionarPergunta(tipo.valor)}
                                className="p-2 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-sm font-medium transition-all"
                              >
                                {tipo.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {editandoPergunta && (
                        <div className="bg-purple-50 rounded-lg p-4 mb-4 border-2 border-purple-400">
                          <h6 className="font-medium text-gray-800 mb-3">Editando Pergunta:</h6>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Texto da Pergunta <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editandoPergunta.label}
                                onChange={(e) =>
                                  setEditandoPergunta({ ...editandoPergunta, label: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Ex: Qual o nome da empresa?"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="obrigatorio-atividade"
                                checked={editandoPergunta.obrigatorio}
                                onChange={(e) =>
                                  setEditandoPergunta({ ...editandoPergunta, obrigatorio: e.target.checked })
                                }
                                className="w-4 h-4 text-purple-600 rounded"
                              />
                              <label htmlFor="obrigatorio-atividade" className="text-sm font-medium text-gray-700">
                                Campo obrigatório
                              </label>
                            </div>

                            {/* Pergunta Condicional */}
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <label className="flex items-center gap-2 mb-3">
                                <input
                                  type="checkbox"
                                  checked={!!editandoPergunta.condicao}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: { perguntaId: null, operador: 'igual', valor: '' },
                                      });
                                    } else {
                                      setEditandoPergunta({ ...editandoPergunta, condicao: null });
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  Pergunta Condicional (só aparece se...)
                                </span>
                              </label>

                              {editandoPergunta.condicao && (
                                <div className="space-y-3 mt-3">
                                  <select
                                    value={editandoPergunta.condicao.perguntaId || ''}
                                    onChange={(e) =>
                                      setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: { ...editandoPergunta.condicao, perguntaId: parseInt(e.target.value) },
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="">Depende da pergunta...</option>
                                    {(questionariosPorDept[departamentoSelecionado] || [])
                                      .filter((p: any) => p.id !== editandoPergunta.id)
                                      .map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                      ))}
                                  </select>
                                  <select
                                    value={editandoPergunta.condicao.operador}
                                    onChange={(e) =>
                                      setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: { ...editandoPergunta.condicao, operador: e.target.value },
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="igual">É igual a</option>
                                    <option value="diferente">É diferente de</option>
                                    <option value="contem">Contém</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={editandoPergunta.condicao.valor}
                                    onChange={(e) =>
                                      setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: { ...editandoPergunta.condicao, valor: e.target.value },
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Ex: Sim"
                                  />
                                </div>
                              )}
                            </div>

                            {(editandoPergunta.tipo === 'select' || editandoPergunta.tipo === 'checkbox') && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Opções de Resposta
                                </label>
                                <div className="space-y-2">
                                  {editandoPergunta.opcoes.map((opcao: string, index: number) => (
                                    <div key={index} className="flex gap-2">
                                      <input
                                        type="text"
                                        value={opcao}
                                        onChange={(e) => atualizarOpcao(index, e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder={`Opção ${index + 1}`}
                                      />
                                      <button type="button" onClick={() => removerOpcao(index)} className="px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={adicionarOpcao}
                                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 text-gray-600 hover:text-purple-600 text-sm font-medium"
                                  >
                                    + Adicionar Opção
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Editor de Grupo Repetível */}
                            {editandoPergunta.tipo === 'grupo_repetivel' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Repetição</label>
                                    <select
                                      value={editandoPergunta.modoRepeticao || 'manual'}
                                      onChange={(e) => setEditandoPergunta({ ...editandoPergunta, modoRepeticao: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      <option value="manual">Manual (botão adicionar)</option>
                                      <option value="numero">Controlado por número</option>
                                    </select>
                                  </div>
                                  {editandoPergunta.modoRepeticao === 'numero' && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">Controlado por</label>
                                      <select
                                        value={editandoPergunta.controladoPor || ''}
                                        onChange={(e) => setEditandoPergunta({ ...editandoPergunta, controladoPor: e.target.value ? Number(e.target.value) : undefined })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      >
                                        <option value="">Selecione...</option>
                                        {(questionariosPorDept[departamentoSelecionado!] || [])
                                          .filter((p: any) => p.tipo === 'number' && p.id !== editandoPergunta.id)
                                          .map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.label || `Pergunta #${p.id}`}</option>
                                          ))}
                                      </select>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Sub-perguntas do Grupo</label>
                                  <div className="space-y-2">
                                    {(editandoPergunta.subPerguntas || []).map((sub: any, idx: number) => (
                                      <div key={sub.id || idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <input
                                          type="text"
                                          value={sub.label}
                                          onChange={(e) => {
                                            const next = [...(editandoPergunta.subPerguntas || [])];
                                            next[idx] = { ...next[idx], label: e.target.value };
                                            setEditandoPergunta({ ...editandoPergunta, subPerguntas: next });
                                          }}
                                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                          placeholder="Texto da sub-pergunta"
                                        />
                                        <select
                                          value={sub.tipo}
                                          onChange={(e) => {
                                            const next = [...(editandoPergunta.subPerguntas || [])];
                                            next[idx] = { ...next[idx], tipo: e.target.value };
                                            setEditandoPergunta({ ...editandoPergunta, subPerguntas: next });
                                          }}
                                          className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        >
                                          <option value="text">Texto</option>
                                          <option value="number">Número</option>
                                          <option value="date">Data</option>
                                          <option value="select">Seleção</option>
                                          <option value="boolean">Sim/Não</option>
                                          <option value="phone">Telefone</option>
                                          <option value="email">Email</option>
                                          <option value="cpf">CPF</option>
                                          <option value="cnpj">CNPJ</option>
                                          <option value="cep">CEP</option>
                                          <option value="money">Valor (R$)</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = (editandoPergunta.subPerguntas || []).filter((_: any, i: number) => i !== idx);
                                            setEditandoPergunta({ ...editandoPergunta, subPerguntas: next });
                                          }}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const novaSub = { id: Date.now() + Math.random(), label: '', tipo: 'text', obrigatorio: false, ordem: (editandoPergunta.subPerguntas || []).length + 1 };
                                        setEditandoPergunta({ ...editandoPergunta, subPerguntas: [...(editandoPergunta.subPerguntas || []), novaSub] });
                                      }}
                                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 text-gray-600 hover:text-purple-600 text-sm font-medium"
                                    >
                                      + Adicionar Sub-pergunta
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditandoPergunta(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={salvarPergunta}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                              >
                                Salvar Pergunta
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {perguntasDepto.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">
                            Perguntas Criadas ({perguntasDepto.length}):
                          </h6>
                          <div className="space-y-2">
                            {perguntasDepto.map((pergunta: any, index: number) => (
                              <div key={pergunta.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                                        {index + 1}
                                      </span>
                                      <span className="font-medium text-sm">{pergunta.label}</span>
                                      {pergunta.obrigatorio && <span className="text-red-500 text-xs">*</span>}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Tipo: {tiposCampo.find((t) => t.valor === pergunta.tipo)?.label}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => setEditandoPergunta(pergunta)} className="p-1 text-purple-600 hover:bg-purple-100 rounded">
                                      <Edit size={14} />
                                    </button>
                                    <button type="button" onClick={() => excluirPergunta(pergunta.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvarComoFluxo}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Salvar como Fluxo
            </button>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}
