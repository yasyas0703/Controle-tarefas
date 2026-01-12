'use client';

import React, { useMemo, useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Check, X } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';

interface NotificacoesPanelProps {
  onClose: () => void;
}

export default function NotificacoesPanel({ onClose }: NotificacoesPanelProps) {
  const {
    notificacoes,
    removerNotificacao,
    marcarNotificacaoComoLida,
    marcarTodasNotificacoesComoLidas,
    adicionarNotificacao,
  } = useSistema();

  const [marcandoIds, setMarcandoIds] = useState<Record<number, boolean>>({});
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const formatarMensagem = (valor: unknown) => {
    if (typeof valor === 'string') return valor;
    if (valor instanceof Error) return valor.message;
    try {
      return JSON.stringify(valor, null, 2);
    } catch {
      return String(valor);
    }
  };

  // Garantir que notificacoes seja sempre um array
  const notificacoesArray = useMemo(() => (Array.isArray(notificacoes) ? notificacoes : []), [notificacoes]);

  const notificacoesOrdenadas = useMemo(() => {
    const copia = [...notificacoesArray];
    copia.sort((a, b) => {
      if (a.lida !== b.lida) return a.lida ? 1 : -1; // não lidas primeiro
      return 0;
    });
    return copia;
  }, [notificacoesArray]);

  const totalNaoLidas = useMemo(
    () => notificacoesArray.filter((n) => !n.lida).length,
    [notificacoesArray]
  );

  const marcarComoLida = async (id: number) => {
    if (marcandoIds[id]) return;
    setMarcandoIds((prev) => ({ ...prev, [id]: true }));
    try {
      await marcarNotificacaoComoLida(id);
    } catch (error: any) {
      adicionarNotificacao(error?.message || 'Erro ao marcar notificação como lida', 'erro');
    } finally {
      setMarcandoIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const marcarTodasComoLidas = async () => {
    if (marcandoTodas) return;
    setMarcandoTodas(true);
    try {
      await marcarTodasNotificacoesComoLidas();
    } catch (error: any) {
      adicionarNotificacao(error?.message || 'Erro ao marcar todas como lidas', 'erro');
    } finally {
      setMarcandoTodas(false);
    }
  };

  const limparLocais = () => {
    notificacoesArray
      .filter((n) => n.origem === 'local')
      .forEach((n) => removerNotificacao(n.id));
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">
          Notificações
          {totalNaoLidas > 0 && (
            <span className="ml-2 bg-cyan-500 text-white text-xs rounded-full px-2 py-1">
              {totalNaoLidas}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {notificacoesArray.some((n) => !n.lida) && (
            <button
              onClick={marcarTodasComoLidas}
              disabled={marcandoTodas}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {marcandoTodas ? 'Marcando...' : 'Marcar todas como lidas'}
            </button>
          )}
          {notificacoesArray.some((n) => n.origem === 'local') && (
            <button onClick={limparLocais} className="text-xs text-gray-500 hover:text-gray-700">
              Limpar avisos locais
            </button>
          )}
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">
            Fechar
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notificacoesOrdenadas.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          notificacoesOrdenadas.map((notif) => (
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
                  <p className="text-sm text-gray-800">{formatarMensagem((notif as any).mensagem)}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.timestamp}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  {!notif.lida && (
                    <button
                      onClick={() => marcarComoLida(notif.id)}
                      disabled={Boolean(marcandoIds[notif.id])}
                      className="text-xs text-blue-600 hover:text-blue-800 p-1 disabled:opacity-50"
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
