'use client';

import React, { useState } from 'react';
import { X, ArrowRight, Edit, Plus, ClipboardList, Mail, Phone } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { Empresa } from '@/app/types';
import ModalBase from './ModalBase';
// (Telefone/email inputs ainda não presentes aqui; removendo imports não utilizados)

interface ModalNovaEmpresaProps {
  onClose: () => void;
}

export default function ModalNovaEmpresa({ onClose }: ModalNovaEmpresaProps) {
  const { departamentos, usuarioLogado, criarProcesso, empresas, criarTemplate, mostrarAlerta } = useSistema();
  
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cliente, setCliente] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [nomeServico, setNomeServico] = useState("");
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
  
  const [questionariosPorDept, setQuestionariosPorDept] = useState<any>({});
  const [departamentoSelecionado, setDepartamentoSelecionado] = useState<number | null>(null);
  const [editandoPergunta, setEditandoPergunta] = useState<any>(null);
  const [fluxoDepartamentos, setFluxoDepartamentos] = useState<number[]>([]);
  const [salvarComoTemplateChecked, setSalvarComoTemplateChecked] = useState(false);

  const tiposCampo = [
    { valor: "text", label: "Texto Simples" },
    { valor: "textarea", label: "Texto Longo" },
    { valor: "number", label: "Número" },
    { valor: "date", label: "Data" },
    { valor: "boolean", label: "Sim/Não" },
    { valor: "select", label: "Seleção Única" },
    { valor: "file", label: "Arquivo/Anexo" },
    { valor: "phone", label: "Telefone" },
    { valor: "email", label: "Email" },
  ];

  const adicionarDepartamentoAoFluxo = (deptId: number) => {
    if (!fluxoDepartamentos.includes(deptId)) {
      setFluxoDepartamentos([...fluxoDepartamentos, deptId]);
      setQuestionariosPorDept({
        ...questionariosPorDept,
        [deptId]: []
      });
    }
    setDepartamentoSelecionado(deptId);
  };

  const removerDepartamentoDoFluxo = (deptId: number) => {
    setFluxoDepartamentos(fluxoDepartamentos.filter(id => id !== deptId));
    const novosQuestionarios = { ...questionariosPorDept };
    delete novosQuestionarios[deptId];
    setQuestionariosPorDept(novosQuestionarios);

    if (departamentoSelecionado === deptId) {
      setDepartamentoSelecionado(null);
    }
  };

  const adicionarPergunta = (tipo: string) => {
    const novaPergunta = {
      id: Date.now(),
      label: "",
      tipo: tipo,
      obrigatorio: false,
      opcoes: tipo === "select" ? [""] : [],
      ordem: (questionariosPorDept[departamentoSelecionado]?.length || 0) + 1,
      condicao: null
    };
    setEditandoPergunta(novaPergunta);
  };

  const salvarPergunta = () => {
    if (!editandoPergunta.label.trim()) {
      void mostrarAlerta('Atenção', 'Digite o texto da pergunta!', 'aviso');
      return;
    }

    const perguntasDepto = questionariosPorDept[departamentoSelecionado] || [];

    if (perguntasDepto.find((p: any) => p.id === editandoPergunta.id)) {
      setQuestionariosPorDept({
        ...questionariosPorDept,
        [departamentoSelecionado]: perguntasDepto.map((p: any) =>
          p.id === editandoPergunta.id ? editandoPergunta : p
        )
      });
    } else {
      setQuestionariosPorDept({
        ...questionariosPorDept,
        [departamentoSelecionado]: [...perguntasDepto, editandoPergunta]
      });
    }

    setEditandoPergunta(null);
  };

  const excluirPergunta = (perguntaId: number) => {
    setQuestionariosPorDept({
      ...questionariosPorDept,
      [departamentoSelecionado]: questionariosPorDept[departamentoSelecionado].filter(
        (p: any) => p.id !== perguntaId
      )
    });
  };

  const adicionarOpcao = () => {
    setEditandoPergunta({
      ...editandoPergunta,
      opcoes: [...editandoPergunta.opcoes, ""],
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaSelecionada) {
      void mostrarAlerta('Atenção', 'Selecione uma empresa.', 'aviso');
      return;
    }

    if (!nomeServico.trim()) {
      void mostrarAlerta('Atenção', 'Digite o nome do serviço!', 'aviso');
      return;
    }

    if (fluxoDepartamentos.length === 0) {
      void mostrarAlerta('Atenção', 'Adicione pelo menos um departamento ao fluxo!', 'aviso');
      return;
    }

    // Validar se gerente está tentando criar solicitação para outro departamento
    if (usuarioLogado?.role === 'gerente' && usuarioLogado.departamento_id) {
      const primeiroDepartamento = fluxoDepartamentos[0];
      if (primeiroDepartamento !== usuarioLogado.departamento_id) {
        void mostrarAlerta('Erro', 'Gerente só pode criar solicitações para seu próprio departamento.', 'erro');
        return;
      }
    }

    try {
      await criarProcesso({
        nome: nomeServico,
        nomeServico,
        nomeEmpresa: nomeEmpresa || empresaSelecionada?.razao_social || empresaSelecionada?.apelido || 'Nova Empresa',
        empresa: nomeEmpresa || empresaSelecionada?.razao_social || empresaSelecionada?.apelido || 'Nova Empresa',
        empresaId: empresaSelecionada.id,
        cliente,
        email,
        telefone,
        fluxoDepartamentos,
        departamentoAtual: fluxoDepartamentos[0],
        departamentoAtualIndex: 0,
        questionariosPorDepartamento: questionariosPorDept,
        criadoPor: usuarioLogado?.nome,
        descricao: `Solicitação criada: ${nomeServico}`,
      });

      if (salvarComoTemplateChecked && usuarioLogado?.role === 'admin') {
        criarTemplate({
          nome: nomeServico,
          descricao: `Template criado a partir da solicitação: ${nomeServico}`,
          fluxoDepartamentos,
          questionariosPorDepartamento: questionariosPorDept,
        });
      }

      onClose();
    } catch (error: any) {
      void mostrarAlerta('Erro', error.message || 'Erro ao criar solicitação', 'erro');
    }
  };

  return (
    <ModalBase isOpen onClose={onClose} labelledBy="nova-solic-title" dialogClassName="w-full max-w-6xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto" zIndex={1050}>
      <div className="rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h3 id="nova-solic-title" className="text-xl font-bold text-white">Nova Solicitação</h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); (e.currentTarget as HTMLFormElement).requestSubmit(); } }}>
          {/* Seção 1: Informações da Solicitação */}
          <div className="bg-cyan-50 dark:bg-[#0f2b34] rounded-xl p-4 border border-cyan-200 dark:border-[#155e75]">
            <h4 className="font-semibold text-cyan-800 mb-4">Informações da Solicitação</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Selecionar Empresa Cadastrada <span className="text-red-500">*</span>
                </label>
                <select
                  value={empresaSelecionada?.id || ""}
                  onChange={(e) => {
                    const empresaId = e.target.value;
                    if (!empresaId) {
                      setEmpresaSelecionada(null);
                      return;
                    }

                    const emp = (empresas || []).find((x) => x.id === Number(empresaId));
                    if (emp) {
                      setEmpresaSelecionada(emp);
                      setNomeEmpresa(emp.razao_social || emp.apelido || 'Empresa');
                      // Não preencher automaticamente o responsável com o nome da empresa
                      // (o usuário escolhe o responsável e o nome do serviço)
                      setEmail(emp.email || '');
                      setTelefone(emp.telefone || '');
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[var(--border)] rounded-xl focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {(empresas || []).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.codigo} - {emp.razao_social}{emp.cadastrada ? '' : ' (NOVA)'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Responsável
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-[var(--border)] rounded-xl focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                  placeholder="Nome do responsável"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome do Serviço <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nomeServico}
                onChange={(e) => setNomeServico(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-[var(--border)] rounded-xl focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                placeholder="Ex: Abertura de Empresa, Alteração Contratual..."
                required
              />
            </div>
          </div>

          {/* Seção 2: Criar Questionários por Departamento */}
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
                      onClick={() => jaAdicionado
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

            {/* Fluxo Visual */}
            {fluxoDepartamentos.length > 0 && (
              <div className="mb-6 bg-white rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  Fluxo da Solicitação ({fluxoDepartamentos.length} departamentos):
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
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 font-medium transition-all ${
                            departamentoSelecionado === deptId
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <ClipboardList size={16} /> {dept.nome}
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
                                  setEditandoPergunta({
                                    ...editandoPergunta,
                                    label: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Ex: Qual o nome da empresa?"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="obrigatorio-nova"
                                checked={editandoPergunta.obrigatorio}
                                onChange={(e) =>
                                  setEditandoPergunta({
                                    ...editandoPergunta,
                                    obrigatorio: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-purple-600 rounded"
                              />
                              <label
                                htmlFor="obrigatorio-nova"
                                className="text-sm font-medium text-gray-700"
                              >
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
                                        condicao: {
                                          perguntaId: null,
                                          operador: "igual",
                                          valor: ""
                                        }
                                      });
                                    } else {
                                      setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: null
                                      });
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
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Depende da pergunta:
                                    </label>
                                    <select
                                      value={editandoPergunta.condicao.perguntaId || ""}
                                      onChange={(e) => setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: {
                                          ...editandoPergunta.condicao,
                                          perguntaId: parseInt(e.target.value)
                                        }
                                      })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      <option value="">Selecione...</option>
                                      {(questionariosPorDept[departamentoSelecionado] || [])
                                        .filter((p: any) => p.id !== editandoPergunta.id)
                                        .map((p: any) => (
                                          <option key={p.id} value={p.id}>
                                            {p.label}
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Condição:
                                    </label>
                                    <select
                                      value={editandoPergunta.condicao.operador}
                                      onChange={(e) => setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: {
                                          ...editandoPergunta.condicao,
                                          operador: e.target.value
                                        }
                                      })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      <option value="igual">É igual a</option>
                                      <option value="diferente">É diferente de</option>
                                      <option value="contem">Contém</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Valor:
                                    </label>
                                    <input
                                      type="text"
                                      value={editandoPergunta.condicao.valor}
                                      onChange={(e) => setEditandoPergunta({
                                        ...editandoPergunta,
                                        condicao: {
                                          ...editandoPergunta.condicao,
                                          valor: e.target.value
                                        }
                                      })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="Ex: Sim"
                                    />
                                  </div>

                                  <div className="bg-white p-2 rounded border border-blue-300">
                                    <p className="text-xs text-gray-600">
                                      📌 Esta pergunta só aparecerá se &quot;{
                                        (questionariosPorDept[departamentoSelecionado] || [])
                                          .find((p: any) => p.id === editandoPergunta.condicao.perguntaId)?.label
                                      }&quot; {editandoPergunta.condicao.operador} &quot;{editandoPergunta.condicao.valor}&quot;
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {editandoPergunta.tipo === "select" && (
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
                                      <button
                                        type="button"
                                        onClick={() => removerOpcao(index)}
                                        className="px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                      >
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
                              <div
                                key={pergunta.id}
                                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                                        {index + 1}
                                      </span>
                                      <span className="font-medium text-sm">
                                        {pergunta.label}
                                      </span>
                                      {pergunta.obrigatorio && (
                                        <span className="text-red-500 text-xs">*</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      Tipo:{" "}
                                      {tiposCampo.find((t) => t.valor === pergunta.tipo)?.label}
                                    </div>
                                  </div>

                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditandoPergunta(pergunta)}
                                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => excluirPergunta(pergunta.id)}
                                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
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

            {/* Checkbox Salvar como Template */}
            {usuarioLogado?.role === "admin" && (
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 mt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salvarComoTemplateChecked}
                    onChange={(e) => setSalvarComoTemplateChecked(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 rounded"
                  />
                  <div>
                    <span className="font-medium text-yellow-800 block">
                      Salvar como Template de Solicitação
                    </span>
                    <p className="text-sm text-yellow-600 mt-1">
                      Crie um template reutilizável com este fluxo e questionários
                    </p>
                  </div>
                </label>
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
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Criar Solicitação
            </button>
          </div>
        </form>
      </div>
    </ModalBase>
  );
}
