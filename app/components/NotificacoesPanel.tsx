'use client';

import React from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Check, X } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';

interface NotificacoesPanelProps {
  onClose: () => void;
}

export default function NotificacoesPanel({ onClose }: NotificacoesPanelProps) {
  const { notificacoes, removerNotificacao } = useSistema();

  // Garantir que notificacoes seja sempre um array
  const notificacoesArray = Array.isArray(notificacoes) ? notificacoes : [];

  const marcarComoLida = (id: number) => {
    // Implementar se necessário
  };

  const limparTodas = () => {
    notificacoesArray.forEach((n) => removerNotificacao(n.id));
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">
          Notificações
          {notificacoesArray.length > 0 && (
            <span className="ml-2 bg-cyan-500 text-white text-xs rounded-full px-2 py-1">
              {notificacoesArray.length}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {notificacoesArray.some((n) => !n.lida) && (
            <button onClick={() => {}} className="text-xs text-blue-600 hover:text-blue-800">
              Marcar todas como lidas
            </button>
          )}
          {notificacoesArray.length > 0 && (
            <button onClick={limparTodas} className="text-xs text-gray-500 hover:text-gray-700">
              Limpar todas
            </button>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notificacoesArray.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          notificacoesArray.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                notif.lida ? 'bg-white' : 'bg-blue-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {notif.tipo === 'sucesso' && <CheckCircle size={16} className="text-green-500" />}
                    {notif.tipo === 'erro' && <AlertCircle size={16} className="text-red-500" />}
                    {notif.tipo === 'info' && <Info size={16} className="text-blue-500" />}
                    {!notif.lida && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                  </div>
                  <p className="text-sm text-gray-800">{notif.mensagem}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.timestamp}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  {!notif.lida && (
                    <button
                      onClick={() => marcarComoLida(notif.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 p-1"
                      title="Marcar como lida"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => removerNotificacao(notif.id)}
                    className="text-xs text-gray-400 hover:text-red-500 p-1"
                    title="Fechar notificação"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
