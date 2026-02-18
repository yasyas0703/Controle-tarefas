'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, FileText, Info, MoreVertical, Trash2, Edit, ClipboardList, Link2 } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { Template } from '@/app/types';
import { api } from '@/app/utils/api';
import LoadingOverlay from '../LoadingOverlay';

interface ModalSelecionarTemplateProps {
  onClose: () => void;
  onEditTemplate?: (template: any) => void;
}

export default function ModalSelecionarTemplate({ onClose, onEditTemplate }: ModalSelecionarTemplateProps) {
  const {
    usuarioLogado,
    criarProcesso,
    empresas,
    departamentos,
    templates,
    processos,
    excluirTemplate: excluirTemplateContext,
    mostrarAlerta,
    mostrarConfirmacao,
  } = useSistema();
  
  const [empresaSelecionada, setEmpresaSelecionada] = useState<any>(null);
  const [responsavelId, setResponsavelId] = useState<number | null>(null);
  const [prazoEntrega, setPrazoEntrega] = useState<string>(new Date().toISOString().split('T')[0]); // Prazo de entrega — padrão: data atual
  const [usuariosResponsaveis, setUsuariosResponsaveis] = useState<Array<{ id: number; nome: string; email: string; role: string; ativo?: boolean }>>([]);
  const [erroUsuariosResponsaveis, setErroUsuariosResponsaveis] = useState<string | null>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState<number | null>(null);
  const [templateComTooltip, setTemplateComTooltip] = useState<number | null>(null);
  const [templateComTooltipNome, setTemplateComTooltipNome] = useState<number | null>(null);
  const [showMenuTemplate, setShowMenuTemplate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [interligarCom, setInterligarCom] = useState<number | null>(null);
  const [interligarParalelo, setInterligarParalelo] = useState(false);
  const [deptIndependente, setDeptIndependente] = useState(false);

  const templatesDisponiveis: Template[] = templates || [];

  const empresasDisponiveis = empresas || [];

  useEffect(() => {
    let ativo = true;
    if (!usuarioLogado) return;
    if (usuarioLogado.role !== 'admin' && usuarioLogado.role !== 'gerente') return;

    setErroUsuariosResponsaveis(null);

    (async () => {
      try {
        const data = await api.getUsuariosResponsaveis();
        if (!ativo) return;
        setUsuariosResponsaveis(Array.isArray(data) ? data : []);
      } catch {
        if (!ativo) return;
        setUsuariosResponsaveis([]);
        setErroUsuariosResponsaveis('Não foi possível carregar os usuários responsáveis.');
      }
    })();

    return () => {
      ativo = false;
    };
  }, [usuarioLogado]);

  const responsavelSelecionado = useMemo(() => {
    if (typeof responsavelId !== 'number') return null;
    return usuariosResponsaveis.find((u) => u.id === responsavelId) ?? null;
  }, [usuariosResponsaveis, responsavelId]);

  const handleCriar = async () => {
    if (!empresaSelecionada) {
      void mostrarAlerta('Atenção', 'Selecione uma empresa.', 'aviso');
      return;
    }

    if (!templateSelecionado) {
      void mostrarAlerta('Atenção', 'Selecione um template.', 'aviso');
      return;
    }

    const template = templatesDisponiveis.find((t) => t.id === templateSelecionado);
    if (!template) {
      void mostrarAlerta('Erro', 'Template não encontrado.', 'erro');
      return;
    }

    const fluxo = (() => {
      const v: any = (template as any).fluxoDepartamentos ?? (template as any).fluxo_departamentos;
      if (Array.isArray(v)) return v as number[];
      try {
        const parsed = JSON.parse(v as any);
        return Array.isArray(parsed) ? (parsed as number[]) : [];
      } catch {
        return [];
      }
    })();

    const deptIds = new Set<number>((departamentos || []).map((d: any) => Number(d.id)).filter((x: any) => Number.isFinite(x)));
    const fluxoNormalizado = (Array.isArray(fluxo) ? fluxo : [])
      .map((x: any) => Number(x))
      .filter((x: any) => Number.isFinite(x))
      .filter((id: number) => (deptIds.size > 0 ? deptIds.has(id) : true));

    const questionariosPorDept = (() => {
      const v: any = (template as any).questionariosPorDepartamento ?? (template as any).questionarios_por_departamento;
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as any;
      try {
        const parsed = JSON.parse(v as any);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    })();

    if (fluxoNormalizado.length === 0) {
      void mostrarAlerta('Template inválido', 'Fluxo vazio ou com departamentos inválidos.', 'aviso');
      return;
    }

    // Responsável: somente via seleção.
    // - ADMIN/GERENTE: obrigatório selecionar um usuário.
    // - USUARIO: usa o próprio usuário logado.
    const responsavelIdFinal = (() => {
      const role = usuarioLogado?.role;
      if (role === 'usuario') {
        const id = Number((usuarioLogado as any)?.id);
        return Number.isFinite(id) ? id : null;
      }
      return typeof responsavelId === 'number' ? responsavelId : null;
    })();

    if (usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'gerente') {
      if (typeof responsavelIdFinal !== 'number') {
        void mostrarAlerta('Atenção', 'Selecione o responsável (usuário).', 'aviso');
        return;
      }
    }

    // Validar se gerente/usuário está tentando criar solicitação para outro departamento
    if (usuarioLogado?.role === 'gerente' || usuarioLogado?.role === 'usuario') {
      const deptUsuario = (usuarioLogado as any).departamentoId ?? (usuarioLogado as any).departamento_id;
      const deptUsuarioNum = Number.isFinite(Number(deptUsuario)) ? Number(deptUsuario) : undefined;
      if (typeof deptUsuarioNum !== 'number') {
        void mostrarAlerta('Erro', 'Usuário sem departamento definido.', 'erro');
        return;
      }
      const primeiroDepartamento = fluxoNormalizado[0];
      if (primeiroDepartamento !== deptUsuarioNum) {
        void mostrarAlerta('Erro', 'Você só pode criar solicitações para seu próprio departamento.', 'erro');
        return;
      }
    }

    try {
      setLoading(true);
      await criarProcesso({
        nome: template.nome,
        nomeServico: template.nome,
        nomeEmpresa: empresaSelecionada?.razao_social || empresaSelecionada?.nome || 'Empresa',
        empresa: empresaSelecionada?.razao_social || empresaSelecionada?.nome || 'Empresa',
        empresaId: empresaSelecionada?.id,
        cliente: (usuariosResponsaveis.find((u) => u.id === responsavelIdFinal)?.nome || '').trim(),
        responsavelId: typeof responsavelIdFinal === 'number' ? responsavelIdFinal : undefined,
        fluxoDepartamentos: fluxoNormalizado,
        departamentoAtual: fluxoNormalizado[0],
        departamentoAtualIndex: 0,
        questionariosPorDepartamento: questionariosPorDept as any,
        personalizado: false,
        templateId: template.id,
        criadoPor: usuarioLogado?.nome,
        descricao: `Solicitação criada via template: ${template.nome}`,
        dataEntrega: prazoEntrega ? new Date(prazoEntrega) : undefined, // Prazo de entrega
        ...(interligarCom ? {
          interligadoComId: interligarCom,
          interligadoNome: templatesDisponiveis.find(t => t.id === interligarCom)?.nome || `Template #${interligarCom}`,
          interligadoParalelo: interligarParalelo,
        } : {}),
        ...(deptIndependente ? { deptIndependente: true } : {}),
      });
      onClose();
    } catch (error: any) {
      void mostrarAlerta('Erro', error.message || 'Erro ao criar solicitação', 'erro');
    } finally {
      setLoading(false);
    }
  };

  const excluirTemplate = (templateId: number, templateNome: string) => {
    if (!usuarioLogado || usuarioLogado.role !== "admin") {
      void mostrarAlerta('Permissão negada', 'Apenas administradores podem excluir templates.', 'aviso');
      return;
    }

    void (async () => {
      const ok = await mostrarConfirmacao({
        titulo: 'Excluir Template',
        mensagem: `Tem certeza que deseja excluir o template "${templateNome}"?\n\nEsta ação não pode ser desfeita.`,
        tipo: 'perigo',
        textoConfirmar: 'Sim, Excluir',
        textoCancelar: 'Cancelar',
      });

      if (ok) {
        excluirTemplateContext(templateId);
        setShowMenuTemplate(null);
      }
    })();
  };

  const formatarData = (data: Date | string) => {
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
  };

  const parseFluxo = (template: Template): number[] => {
    const v: any = (template as any).fluxoDepartamentos ?? (template as any).fluxo_departamentos;
    if (Array.isArray(v)) return v as number[];
    try {
      const parsed = JSON.parse(v as any);
      return Array.isArray(parsed) ? (parsed as number[]) : [];
    } catch {
      return [];
    }
  };

  const parseQuestionarios = (template: Template): Record<number, any[]> => {
    const v: any = (template as any).questionariosPorDepartamento ?? (template as any).questionarios_por_departamento;
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as any;
    try {
      const parsed = JSON.parse(v as any);
      return parsed && typeof parsed === 'object' ? (parsed as any) : {};
    } catch {
      return {};
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
        <LoadingOverlay show={loading} text="Criando solicitação..." />
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardList size={18} /> Nova Solicitação (Template)
              </h3>
              <p className="text-white opacity-90 text-sm mt-1">
                Selecione um template e preencha os dados básicos
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCriar();
          }}
          className="p-6 space-y-6"
        >
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-4">Dados da Empresa</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Selecionar Empresa Cadastrada <span className="text-red-500">*</span>
                </label>
                <select
                  value={empresaSelecionada?.id || ""}
                  onChange={(e) => {
                    const empresaId = e.target.value;
                    if (empresaId) {
                      const empresa = empresasDisponiveis.find((emp: any) => emp.id === parseInt(empresaId));
                      setEmpresaSelecionada(empresa);
                    } else {
                      setEmpresaSelecionada(null);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {empresasDisponiveis.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.codigo} - {emp.razao_social}
                      {String(emp.cnpj ?? '').replace(/\D/g, '').length > 0 ? '' : ' (NOVA)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Responsável (usuário)
                </label>
                <select
                  value={responsavelId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setResponsavelId(null);
                      return;
                    }
                    const id = Number(v);
                    setResponsavelId(Number.isFinite(id) ? id : null);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required={usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'gerente'}
                  disabled={usuarioLogado?.role === 'usuario'}
                >
                  <option value="">
                    {usuarioLogado?.role === 'usuario'
                      ? 'Responsável será você'
                      : 'Selecione um usuário'}
                  </option>
                  {usuariosResponsaveis.map((u) => (
                    <option key={u.id} value={u.id} disabled={u.ativo === false}>
                      {u.nome} ({u.email}){u.ativo === false ? ' (inativo)' : ''}
                    </option>
                  ))}
                </select>
                {erroUsuariosResponsaveis && (
                  <p className="text-xs text-red-600 mt-2">
                    {erroUsuariosResponsaveis}
                  </p>
                )}
                {(usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'gerente') && usuariosResponsaveis.length === 0 && !erroUsuariosResponsaveis && (
                  <p className="text-xs text-gray-600 mt-2">
                    Nenhum usuário encontrado para seleção.
                  </p>
                )}
              </div>
            </div>

            {empresaSelecionada && (
              <div className="mt-3 bg-white rounded-lg p-3 border border-purple-200">
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-gray-900">{empresaSelecionada.razao_social}</p>
                  <p className="text-gray-600">📄 CNPJ: {empresaSelecionada.cnpj}</p>
                  {responsavelSelecionado?.nome && (
                    <p className="text-gray-600">👤 Responsável: {responsavelSelecionado.nome}</p>
                  )}
                </div>
              </div>
            )}

            {/* Campo de Prazo de Entrega */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📅 Prazo de Entrega <span className="text-gray-400 text-xs font-normal">(opcional - aparece no calendário)</span>
              </label>
              <input
                type="date"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-purple-300 dark:border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 bg-purple-50 dark:bg-purple-900/20 text-gray-900 dark:text-[var(--fg)]"
              />
              {prazoEntrega && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  ✓ Esta solicitação aparecerá no calendário em {new Date(prazoEntrega + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            {/* Interligação com outra solicitação (template/atividade) */}
            {templatesDisponiveis.length > 1 && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Link2 className="inline w-4 h-4 mr-1" />
                  Interligar com outra atividade <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                </label>
                <select
                  value={interligarCom || ''}
                  onChange={(e) => setInterligarCom(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-purple-300 dark:border-purple-700 rounded-xl focus:ring-2 focus:ring-purple-500 bg-purple-50 dark:bg-purple-900/20 text-gray-900 dark:text-[var(--fg)]"
                >
                  <option value="">Nenhuma (solicitação independente)</option>
                  {templatesDisponiveis
                    .filter(t => t.id !== templateSelecionado)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nome}{t.descricao ? ` — ${t.descricao}` : ''}
                      </option>
                    ))}
                </select>
                {interligarCom && (
                  <>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      🔗 Ao finalizar esta solicitação, a atividade selecionada será criada automaticamente como continuação.
                    </p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
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
          </div>

          {/* Departamentos Independentes (paralelo) */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={deptIndependente}
                onChange={(e) => setDeptIndependente(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                  ⚡ Departamentos trabalham em paralelo
                </span>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  Ative se cada departamento pode preencher seu questionário independentemente.
                  A solicitação aparecerá em todos os departamentos do fluxo. O check (finalização)
                  segue a ordem: dep 1 precisa dar check antes do 2, que precisa antes do 3, e assim por diante.
                </p>
              </div>
            </label>
          </div>

          <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-cyan-800">
                Selecione o Template <span className="text-red-500">*</span>
              </h4>
              {usuarioLogado?.role === "admin" && (
                <span className="text-xs text-gray-500">
                  Admins: clique nos três pontos para excluir
                </span>
              )}
            </div>

            {templatesDisponiveis.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-2">Nenhum template disponível</p>
                <p className="text-sm text-gray-500">
                  Admins precisam criar templates primeiro
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templatesDisponiveis.map(template => (
                  <div
                    key={template.id}
                    className={`border-2 rounded-xl p-4 transition-all relative ${
                      templateSelecionado === template.id
                        ? 'border-cyan-500 bg-cyan-100'
                        : 'border-gray-200 hover:border-cyan-300 cursor-pointer'
                    }`}
                  >
                    <label className="cursor-pointer block">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={templateSelecionado === template.id}
                        onChange={() => setTemplateSelecionado(template.id)}
                        className="sr-only"
                      />
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={20} className="text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="relative">
                            <h5
                              className="font-bold text-lg text-cyan-700 mb-2 truncate cursor-help"
                              onMouseEnter={() => setTemplateComTooltipNome(template.id)}
                              onMouseLeave={() => setTemplateComTooltipNome(null)}
                            >
                              {template.nome}
                            </h5>

                            {templateComTooltipNome === template.id && (
                              <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 z-50 shadow-xl">
                                <div className="font-semibold">{template.nome}</div>
                                {template.descricao && (
                                  <div className="text-gray-300 text-xs mt-1">{template.descricao}</div>
                                )}
                              </div>
                            )}
                          </div>

                          {template.descricao && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.descricao}
                            </p>
                          )}

                          <div className="relative inline-block mt-2">
                            <button
                              type="button"
                              onMouseEnter={() => setTemplateComTooltip(template.id)}
                              onMouseLeave={() => setTemplateComTooltip(null)}
                              className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                            >
                              <Info size={12} />
                              Ver detalhes do fluxo
                            </button>

                            {templateComTooltip === template.id && (
                              <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-50 shadow-xl">
                                <div className="font-semibold mb-2">Fluxo do Template:</div>
                                <div className="space-y-2">
                                  {parseFluxo(template).map((deptId, index) => {
                                    const dept = departamentos.find(d => d.id === deptId);
                                    const perguntas = parseQuestionarios(template)[deptId] || [];

                                    return (
                                      <div key={deptId} className="flex items-start gap-2">
                                        <div className="bg-cyan-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                          {index + 1}
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium">
                                            {dept?.nome || `Departamento ${deptId}`}
                                          </div>
                                          <div className="text-cyan-300">
                                            {perguntas.length} pergunta(s)
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="border-t border-gray-700 mt-2 pt-2 text-cyan-300">
                                  Total: {parseFluxo(template).length} departamentos
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>{parseFluxo(template).length} departamentos</span>
                            <span>•</span>
                            <span>Criado em {formatarData(template.criado_em)}</span>
                          </div>
                        </div>
                      </div>
                    </label>

                    {usuarioLogado?.role === "admin" && (
                      <div className="absolute top-3 right-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenuTemplate(
                              showMenuTemplate === template.id ? null : template.id
                            );
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {showMenuTemplate === template.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[var(--card)] rounded-lg shadow-xl border border-gray-200 dark:border-[var(--border)] z-50 min-w-[140px] overflow-hidden">
                            {onEditTemplate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMenuTemplate(null);
                                  onEditTemplate(template);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 transition-colors"
                              >
                                <Edit size={14} />
                                <span>Editar (cópia)</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                excluirTemplate(template.id, template.nome);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 size={14} />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
              disabled={!templateSelecionado || !empresaSelecionada}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              Criar Solicitação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
