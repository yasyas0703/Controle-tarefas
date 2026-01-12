'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, UserPlus, Edit, Check, User, Play, Pause } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { api } from '@/app/utils/api';
import ModalBase from './ModalBase';

interface ModalGerenciarUsuariosProps {
  onClose: () => void;
}

export default function ModalGerenciarUsuarios({ onClose }: ModalGerenciarUsuariosProps) {
  const { departamentos, usuarios, setUsuarios, mostrarAlerta, mostrarConfirmacao, adicionarNotificacao, usuarioLogado } = useSistema();

  const [novoUsuario, setNovoUsuario] = useState({ 
    nome: '', 
    email: '',
    senha: '',
    role: 'usuario' as 'admin' | 'gerente' | 'usuario', 
    departamentoId: undefined as number | undefined,
    permissoes: [] as string[]
  });
  
  const [editandoUsuario, setEditandoUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Carregar usuários ao abrir o modal
  useEffect(() => {
    async function carregarUsuarios() {
      try {
        const usuariosData = await api.getUsuarios();
        // Converter roles de maiúsculas para minúsculas para o frontend
        const usuariosConvertidos = (usuariosData || []).map((u: any) => ({
          ...u,
          role: typeof u.role === 'string' ? u.role.toLowerCase() : u.role
        }));
        setUsuarios(usuariosConvertidos || []);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    }
    carregarUsuarios();
  }, [setUsuarios]);

  const permissoesDisponiveis = [
    { id: "criar_processo", label: "Criar Processos" },
    { id: "editar_processo", label: "Editar Processos" },
    { id: "excluir_processo", label: "Excluir Processos" },
    { id: "criar_tag", label: "Criar Tags" },
    { id: "editar_tag", label: "Editar Tags" },
    { id: "excluir_tag", label: "Excluir Tags" },
    { id: "criar_departamento", label: "Criar Departamentos" },
    { id: "editar_departamento", label: "Editar Departamentos" },
    { id: "excluir_departamento", label: "Excluir Departamentos" },
    { id: "gerenciar_usuarios", label: "Gerenciar Usuários" }
  ];

  const handleCriarUsuario = async () => {
    if (!String(novoUsuario.nome || '').trim() || !String(novoUsuario.email || '').trim() || !String(novoUsuario.senha || '').trim()) {
      await mostrarAlerta('Atenção', 'Preencha nome, email e senha.', 'aviso');
      return;
    }

    // Validar que gerente precisa ter departamento
    if (novoUsuario.role === 'gerente' && !novoUsuario.departamentoId) {
      await mostrarAlerta('Atenção', 'Gerente deve ter um departamento associado.', 'aviso');
      return;
    }

    try {
      setLoading(true);
      const usuario = await api.salvarUsuario({
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        senha: novoUsuario.senha,
        role: novoUsuario.role.toUpperCase() as 'ADMIN' | 'GERENTE' | 'USUARIO',
        departamentoId: novoUsuario.departamentoId,
        permissoes: novoUsuario.permissoes,
      });
      
      // Recarregar usuários
      const usuariosData = await api.getUsuarios();
      const usuariosConvertidos = (usuariosData || []).map((u: any) => ({
        ...u,
        role: typeof u.role === 'string' ? u.role.toLowerCase() : u.role,
        departamento_id: u.departamento?.id || u.departamentoId
      }));
      setUsuarios(usuariosConvertidos || []);
      
      adicionarNotificacao('Usuário criado com sucesso', 'sucesso');
      setNovoUsuario({ nome: '', email: '', senha: '', role: 'usuario', departamentoId: undefined, permissoes: [] });
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao criar usuário';
      adicionarNotificacao(errorMessage, 'erro');
      await mostrarAlerta('Erro', errorMessage, 'erro');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarUsuario = async () => {
    if (!String(editandoUsuario?.nome || '').trim() || !String(editandoUsuario?.email || '').trim()) {
      await mostrarAlerta('Atenção', 'Preencha nome e email do usuário.', 'aviso');
      return;
    }

    try {
      setLoading(true);
      await api.atualizarUsuario(editandoUsuario.id, {
        nome: editandoUsuario.nome,
        email: editandoUsuario.email,
        role: (typeof editandoUsuario.role === 'string' ? editandoUsuario.role.toUpperCase() : editandoUsuario.role) as 'ADMIN' | 'GERENTE' | 'USUARIO',
        departamentoId: editandoUsuario.departamentoId,
        permissoes: editandoUsuario.permissoes || [],
        ativo: editandoUsuario.ativo,
        ...(editandoUsuario.senha && { senha: editandoUsuario.senha }),
      });
      
      // Recarregar usuários
      const usuariosData = await api.getUsuarios();
      const usuariosConvertidos = (usuariosData || []).map((u: any) => ({
        ...u,
        role: typeof u.role === 'string' ? u.role.toLowerCase() : u.role
      }));
      setUsuarios(usuariosConvertidos || []);
      
      adicionarNotificacao('Usuário atualizado com sucesso', 'sucesso');
      setEditandoUsuario(null);
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao editar usuário', 'erro');
      await mostrarAlerta('Erro', error.message || 'Erro ao editar usuário', 'erro');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluirUsuario = async (id: number) => {
    const usuario = usuarios.find(u => u.id === id);
    const ok = await mostrarConfirmacao({
      titulo: 'Excluir Usuário',
      mensagem: `Tem certeza que deseja excluir o usuário "${usuario?.nome || ''}"?\n\nEsta ação não poderá ser desfeita.`,
      tipo: 'perigo',
      textoConfirmar: 'Sim, Excluir',
      textoCancelar: 'Cancelar',
    });

    if (ok) {
      try {
        setLoading(true);
        await api.excluirUsuario(id);
        
        // Recarregar usuários
        const usuariosData = await api.getUsuarios();
        const usuariosConvertidos = (usuariosData || []).map((u: any) => ({
          ...u,
          role: typeof u.role === 'string' ? u.role.toLowerCase() : u.role
        }));
        setUsuarios(usuariosConvertidos || []);
        
        adicionarNotificacao('Usuário excluído com sucesso', 'sucesso');
      } catch (error: any) {
        adicionarNotificacao(error.message || 'Erro ao excluir usuário', 'erro');
        await mostrarAlerta('Erro', error.message || 'Erro ao excluir usuário', 'erro');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleStatusUsuario = async (usuario: any) => {
    if (usuarioLogado?.id && usuario?.id === usuarioLogado.id) {
      await mostrarAlerta('Atenção', 'Você não pode desativar seu próprio usuário.', 'aviso');
      return;
    }

    try {
      setLoading(true);
      await api.atualizarUsuario(usuario.id, {
        ativo: !usuario.ativo,
      });
      
      // Recarregar usuários
      const usuariosData = await api.getUsuarios();
      const usuariosConvertidos = (usuariosData || []).map((u: any) => ({
        ...u,
        role: typeof u.role === 'string' ? u.role.toLowerCase() : u.role
      }));
      setUsuarios(usuariosConvertidos || []);
      
      adicionarNotificacao(`Usuário ${!usuario.ativo ? 'ativado' : 'desativado'} com sucesso`, 'sucesso');
    } catch (error: any) {
      adicionarNotificacao(error.message || 'Erro ao alterar status', 'erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ModalBase
        isOpen
        onClose={onClose}
        labelledBy="gerenciar-usuarios-title"
        dialogClassName="w-full max-w-6xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
        zIndex={1080}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h3 id="gerenciar-usuarios-title" className="text-xl font-bold text-white">Gerenciar Usuários</h3>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
            {/* Formulário Criar/Editar */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <h4 className="font-semibold text-gray-800 mb-4">
                {editandoUsuario ? `Editando: ${editandoUsuario.nome}` : 'Criar Novo Usuário'}
              </h4>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do usuário *
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do usuário"
                      value={editandoUsuario ? editandoUsuario.nome : novoUsuario.nome}
                      onChange={(e) => editandoUsuario 
                        ? setEditandoUsuario({ ...editandoUsuario, nome: e.target.value })
                        : setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[var(--border)] rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editandoUsuario ? 'Nova Senha (opcional)' : 'Senha *'}
                    </label>
                    <input
                      type="password"
                      placeholder={editandoUsuario ? "Nova senha (opcional)" : "Senha"}
                      value={editandoUsuario ? (editandoUsuario.senha || '') : novoUsuario.senha}
                      onChange={(e) => editandoUsuario
                        ? setEditandoUsuario({ ...editandoUsuario, senha: e.target.value })
                        : setNovoUsuario({ ...novoUsuario, senha: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[var(--border)] rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (login) *
                  </label>
                  <input
                    type="email"
                    placeholder="email@empresa.com"
                    value={editandoUsuario ? editandoUsuario.email : novoUsuario.email}
                    onChange={(e) => editandoUsuario
                      ? setEditandoUsuario({ ...editandoUsuario, email: e.target.value })
                      : setNovoUsuario({ ...novoUsuario, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-[var(--border)] rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Usuário
                    </label>
                    <select
                      value={editandoUsuario ? (typeof editandoUsuario.role === 'string' ? editandoUsuario.role.toLowerCase() : editandoUsuario.role) : novoUsuario.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'admin' | 'gerente' | 'usuario';
                        if (editandoUsuario) {
                          setEditandoUsuario({ ...editandoUsuario, role: newRole });
                        } else {
                          setNovoUsuario({ ...novoUsuario, role: newRole });
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-[var(--border)] rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                    >
                      <option value="usuario">Usuário</option>
                      <option value="gerente">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  {(editandoUsuario ? editandoUsuario.role === 'gerente' : novoUsuario.role === 'gerente') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Departamento *
                      </label>
                      <select
                        value={editandoUsuario ? editandoUsuario.departamentoId : novoUsuario.departamentoId}
                        onChange={(e) => {
                          const deptId = e.target.value ? parseInt(e.target.value) : undefined;
                          if (editandoUsuario) {
                            setEditandoUsuario({ ...editandoUsuario, departamentoId: deptId });
                          } else {
                            setNovoUsuario({ ...novoUsuario, departamentoId: deptId });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-[var(--border)] rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                      >
                        <option value="">Selecione...</option>
                        {departamentos.map(d => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editandoUsuario && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={editandoUsuario.ativo}
                          onChange={(e) => setEditandoUsuario({ 
                            ...editandoUsuario, 
                            ativo: e.target.checked 
                          })}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          Usuário ativo
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  {editandoUsuario ? (
                    <>
                      <button
                        onClick={() => setEditandoUsuario(null)}
                        className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleEditarUsuario}
                        className="flex-1 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                      >
                        Salvar Alterações
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCriarUsuario}
                      className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
                    >
                      Criar Usuário
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de Usuários */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Usuários Cadastrados ({usuarios.length})
              </h4>

              <div className="space-y-3">
                {usuarios.map(user => (
                  <div key={user.id} className="bg-gray-50 dark:bg-[var(--muted)] rounded-lg p-4 border border-gray-200 dark:border-[var(--border)]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {user.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium dark:text-[var(--fg)]">{user.nome}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {user.role === 'admin' && 'Administrador'}
                            {user.role === 'gerente' && `Gerente - ${(user as any).departamento?.nome || 'N/A'}`}
                            {(user.role === 'usuario' || !user.role) && 'Usuário'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.ativo 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.ativo ? 'Ativo' : 'Inativo'}
                        </span>

                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleStatusUsuario(user)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                            title={user.ativo ? "Desativar" : "Ativar"}
                          >
                            {user.ativo ? <Pause size={16} /> : <Play size={16} />}
                          </button>

                          <button
                            onClick={() => {
                              // Converter role para minúsculas ao editar
                              setEditandoUsuario({
                                ...user,
                                role: typeof user.role === 'string' ? user.role.toLowerCase() : user.role
                              });
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            onClick={() => handleExcluirUsuario(user.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </ModalBase>

    </>
  );
}