'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { LogIn } from 'lucide-react';
import ModalBase from './ModalBase';
import { api } from '@/app/utils/api';

interface ModalLoginProps {
  onLogin: (usuario: any) => void;
}

export default function ModalLogin({ onLogin }: ModalLoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });

  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    if (!formData.email || !formData.senha) {
      setErro('Preencha todos os campos');
      setLoading(false);
      return;
    }

    try {
      const response = await api.login(formData.email, formData.senha);
      
      if (response.usuario) {
        // Mapeia o formato do backend para o formato esperado pelo frontend
        const deptId =
          typeof (response.usuario as any).departamentoId === 'number'
            ? (response.usuario as any).departamentoId
            : typeof (response.usuario as any).departamento?.id === 'number'
              ? (response.usuario as any).departamento.id
              : undefined;
        const usuario = {
          id: response.usuario.id,
          nome: response.usuario.nome,
          email: response.usuario.email,
          role: response.usuario.role.toLowerCase() as 'admin' | 'gerente' | 'usuario',
          ativo: (response.usuario as any).ativo,
          departamentoId: deptId,
          departamento_id: deptId,
          permissoes: response.usuario.permissoes || [],
        };
        onLogin(usuario);
      } else {
        setErro('Erro ao fazer login');
      }
    } catch (error: any) {
      setErro(error.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBase
      isOpen
      onClose={() => {}}
      labelledBy="login-title"
      describedBy="login-desc"
      initialFocusSelector="#login-user"
      dialogClassName="w-full max-w-md bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none"
    >
        {/* Card Principal */}
        <div className="bg-white dark:bg-[var(--card)] rounded-2xl overflow-hidden">
          {/* Header com Gradient */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/25 p-[2px] rounded-2xl shadow-lg">
                <div className="w-20 h-20 rounded-[14px] bg-white/15 backdrop-blur flex items-center justify-center">
                  <Image
                    src="/triar.png"
                    alt="Logo"
                    width={56}
                    height={56}
                    priority
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>
            </div>
            <h1 id="login-title" className="text-3xl font-bold text-center">Sistema de Abertura</h1>
            <p id="login-desc" className="text-center text-white/90 mt-2">Gerenciamento de Processos</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-[var(--border)] rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200 text-gray-900 dark:text-[var(--fg)] bg-white dark:bg-[var(--card)]"
                  placeholder="seu@email.com"
                  id="login-user"
                  aria-required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-[var(--border)] rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200 text-gray-900 dark:text-[var(--fg)] bg-white dark:bg-[var(--card)]"
                  placeholder="Sua senha"
                  aria-required
                  disabled={loading}
                />
              </div>

              {erro && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm" role="alert">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <LogIn size={20} />
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-[var(--border)] text-center text-sm text-gray-600 dark:text-gray-300">
            Versão 1.0 - Sistema de Abertura © 2026
          </div>
        </div>
    </ModalBase>
  );
}
