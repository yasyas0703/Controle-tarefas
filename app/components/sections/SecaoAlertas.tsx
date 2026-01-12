'use client';

import React from 'react';
import { AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';

export default function SecaoAlertas() {
  const { processos } = useSistema();

  const processosEmRisco = processos.filter((p) => {
    if (!p.dataEntrega) return false;
    const diasRestantes = Math.ceil(
      (new Date(p.dataEntrega).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return diasRestantes < 5 && p.status === 'em_andamento';
  });

  if (processosEmRisco.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
        <div className="flex-1">
          <h3 className="font-bold text-red-900 text-lg mb-2">
            ⚠️ {processosEmRisco.length} Processo(s) em Risco
          </h3>
          <p className="text-red-700 text-sm mb-4">
            Os seguintes processos estão próximos do prazo de entrega:
          </p>
          <div className="space-y-2">
            {processosEmRisco.map((p) => (
              <div key={p.id} className="bg-white bg-opacity-70 rounded-lg p-3 flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                <span className="text-sm text-gray-900">
                  <strong>
                    {typeof (p as any).empresa === 'string'
                      ? (p as any).empresa
                      : (p as any).empresa?.razao_social ||
                        (p as any).empresa?.apelido ||
                        (p as any).nomeEmpresa ||
                        'Empresa'}
                  </strong>{' '}
                  - Entrega em{' '}
                  {new Date(p.dataEntrega!).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
