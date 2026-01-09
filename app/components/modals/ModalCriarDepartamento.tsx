'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Edit, FileText, Users, Calculator, FileCheck, Briefcase } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import * as LucideIcons from 'lucide-react';

interface ModalCriarDepartamentoProps {
  onClose: () => void;
  onSave: (departamento: any) => void;
  departamento?: any;
}

export default function ModalCriarDepartamento({
  onClose,
  onSave,
  departamento,
}: ModalCriarDepartamentoProps) {
  const { mostrarAlerta } = useSistema();
  const [formData, setFormData] = useState({
    nome: departamento?.nome || '',
    responsavel: departamento?.responsavel || '',
    descricao: departamento?.descricao || '',
    cor: departamento?.cor || 'from-cyan-500 to-blue-600',
    icone: (() => {
      // Normalizar ícone - garantir que seja sempre uma string com o nome do ícone
      if (!departamento?.icone) return 'FileText';
      if (typeof departamento.icone === 'string') {
        // Verificar se é um dos nomes válidos
        const nomesValidos = ['FileText', 'Users', 'Calculator', 'FileCheck', 'Briefcase', 'Edit'];
        return nomesValidos.includes(departamento.icone) ? departamento.icone : 'FileText';
      }
      return 'FileText';
    })(),
  });

  const coresDisponiveis = [
    { nome: 'Ciano', gradient: 'from-cyan-400 to-blue-500', solida: 'bg-cyan-500' },
    { nome: 'Azul', gradient: 'from-blue-500 to-indigo-600', solida: 'bg-blue-600' },
    { nome: 'Rosa', gradient: 'from-purple-500 to-pink-600', solida: 'bg-purple-600' },
    { nome: 'Verde', gradient: 'from-green-500 to-emerald-600', solida: 'bg-green-600' },
    { nome: 'Laranja', gradient: 'from-orange-500 to-red-600', solida: 'bg-orange-600' },
    { nome: 'Amarelo', gradient: 'from-yellow-500 to-amber-600', solida: 'bg-yellow-600' },
  ];

  const iconesDisponiveis = [
    { nome: 'FileText', componente: FileText, label: 'Documento' },
    { nome: 'Users', componente: Users, label: 'Usuários' },
    { nome: 'Calculator', componente: Calculator, label: 'Calculadora' },
    { nome: 'FileCheck', componente: FileCheck, label: 'Verificação' },
    { nome: 'Briefcase', componente: Briefcase, label: 'Maleta' },
    { nome: 'Edit', componente: Edit, label: 'Editar' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      void mostrarAlerta('Atenção', 'Digite o nome do departamento!', 'aviso');
      return;
    }

    if (!formData.responsavel.trim()) {
      void mostrarAlerta('Atenção', 'Digite o nome do responsável!', 'aviso');
      return;
    }

    const corSelecionada = coresDisponiveis.find(c => c.gradient === formData.cor);
    const iconeSelecionado = iconesDisponiveis.find(i => i.nome === formData.icone);

    onSave({
      id: departamento?.id || Date.now(),
      nome: formData.nome,
      responsavel: formData.responsavel,
      descricao: formData.descricao,
      cor: formData.cor,
      corSolida: corSelecionada?.solida,
      icone: iconeSelecionado?.nome || 'FileText', // Sempre salvar o nome do ícone como string
      criadoEm: departamento?.criadoEm || new Date(),
    });

    onClose();
  };

  const iconeAtualInfo = iconesDisponiveis.find(i => i.nome === formData.icone);
  const IconeAtual = iconeAtualInfo?.componente || FileText;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header com gradiente */}
        <div className={`bg-gradient-to-r ${formData.cor} p-6 rounded-t-2xl sticky top-0`}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">
              {departamento ? 'Editar Departamento' : 'Criar Novo Departamento'}
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome do Departamento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome do Departamento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
              placeholder="Ex: Cadastro, RH, Fiscal..."
              required
            />
          </div>

          {/* Responsável */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Responsável <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.responsavel}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
              placeholder="Nome do responsável"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 resize-none"
              placeholder="Breve descrição do departamento..."
            />
          </div>

          {/* Cor do Departamento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cor do Departamento
            </label>
            <div className="grid grid-cols-3 gap-3">
              {coresDisponiveis.map((cor) => (
                <button
                  key={cor.nome}
                  type="button"
                  onClick={() => setFormData({ ...formData, cor: cor.gradient })}
                  className={`p-4 rounded-xl bg-gradient-to-r ${cor.gradient} text-white font-medium transition-all ${
                    formData.cor === cor.gradient
                      ? 'ring-4 ring-offset-2 ring-gray-400 scale-105'
                      : 'hover:scale-105'
                  }`}
                >
                  {cor.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Ícone do Departamento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ícone do Departamento
            </label>
            <div className="grid grid-cols-6 gap-3">
              {iconesDisponiveis.map((icone) => {
                const IconeComp = icone.componente;
                return (
                  <button
                    key={icone.nome}
                    type="button"
                    onClick={() => setFormData({ ...formData, icone: icone.nome })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.icone === icone.nome
                        ? 'border-cyan-500 bg-cyan-50 scale-110'
                        : 'border-gray-300 hover:border-cyan-300 hover:scale-105'
                    }`}
                    title={icone.label || icone.nome}
                  >
                    <IconeComp
                      size={24}
                      className={
                        formData.icone === icone.nome
                          ? 'text-cyan-600'
                          : 'text-gray-600'
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview do Departamento */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Preview:</h4>
            <div className={`bg-gradient-to-br ${formData.cor} p-4 rounded-xl text-white`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <IconeAtual size={24} />
                </div>
                <div>
                  <h5 className="font-bold text-lg">
                    {formData.nome || 'Nome do Departamento'}
                  </h5>
                  <p className="text-sm opacity-90">
                    {formData.responsavel || 'Responsável'}
                  </p>
                </div>
              </div>
              {formData.descricao && (
                <p className="mt-3 text-sm opacity-90">
                  {formData.descricao}
                </p>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium"
            >
              {departamento ? 'Salvar Alterações' : 'Criar Departamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}