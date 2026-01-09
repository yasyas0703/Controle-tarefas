'use client';

import React, { useState } from 'react';
import { Bell, Download, TrendingUp, Plus, FileText, Users, User, X } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { temPermissao as verificarPermissao } from '@/app/utils/permissions';
import NotificacoesPanel from './NotificacoesPanel';

interface HeaderProps {
  onNovaEmpresa: () => void;
  onPersonalizado: () => void;
  onGerenciarUsuarios: () => void;
  onAnalytics: () => void;
  onSelecionarTemplate: () => void;
  onLogout: () => void;
}

export default function Header({
  onNovaEmpresa,
  onPersonalizado,
  onGerenciarUsuarios,
  onAnalytics,
  onSelecionarTemplate,
  onLogout,
}: HeaderProps) {
  const { notificacoes, usuarioLogado } = useSistema();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Garantir que notificacoes seja sempre um array
  const notificacoesArray = Array.isArray(notificacoes) ? notificacoes : [];
  const notificacoesNaoLidas = notificacoesArray.filter((n) => !n.lida);

  const temPermissao = (permissao: string, contexto: any = {}) => {
    return verificarPermissao(usuarioLogado, permissao, contexto);
  };

  return (
    <div className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-xl shadow-lg overflow-hidden bg-white flex items-center justify-center">
              <img
                src="/triar.png"
                alt="Logo Triar"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sistema de Abertura
              </h1>
              <p className="text-gray-600 text-sm">Gerenciamento de Processos</p>
            </div>
          </div>

          {/* Ações e Botões */}
          <div className="flex items-center gap-3">
            {/* Notificações */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors relative"
              >
                <Bell size={20} className="text-gray-600" />
                {notificacoesNaoLidas.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notificacoesNaoLidas.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <NotificacoesPanel onClose={() => setShowNotifications(false)} />
              )}
            </div>

            {/* Botão Análises - todos podem ver */}
            {temPermissao('ver_analises') && (
              <button
                onClick={onAnalytics}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-w-[180px] justify-center"
              >
                <TrendingUp size={20} />
                <span>Análises</span>
              </button>
            )}

            {/* Botões de Criação */}
            {temPermissao('criar_processo') && (
              <div className="flex gap-3">
                {/* Usuários normais não veem o botão Nova Solicitação (só análises) */}
                {(usuarioLogado?.role === 'admin' || usuarioLogado?.role === 'gerente') && (
                  <button
                    onClick={onSelecionarTemplate}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-w-[180px] justify-center"
                    title="Nova Solicitação usando Templates"
                  >
                    <FileText size={20} />
                    <span className="truncate">Nova Solicitação</span>
                  </button>
                )}

                {/* Apenas admin e gerente podem criar solicitações personalizadas */}
                {temPermissao('criar_processo_personalizado') && (
                  <button
                    onClick={onPersonalizado}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-w-[180px] justify-center"
                    title="Criar Solicitação Personalizada"
                  >
                    <Plus size={20} />
                    <span>Personalizada</span>
                  </button>
                )}
              </div>
            )}

            {/* Botão Usuários - apenas admin */}
            {temPermissao('gerenciar_usuarios') && (
              <button
                onClick={onGerenciarUsuarios}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-w-[180px] justify-center"
              >
                <Users size={20} />
                <span>Usuários</span>
              </button>
            )}

            {/* Info Usuário */}
            {usuarioLogado && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
                <User size={16} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{usuarioLogado.nome}</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    usuarioLogado.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : usuarioLogado.role === 'gerente'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {usuarioLogado.role === 'admin' ? 'Admin' : usuarioLogado.role === 'gerente' ? 'Gerente' : 'Usuário'}
                </span>
                <button
                  onClick={onLogout}
                  className="ml-2 text-red-600 hover:text-red-700"
                  title="Sair"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
