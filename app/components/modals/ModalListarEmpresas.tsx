'use client';

import React, { useState } from 'react';
import { X, Search, Building, RefreshCw, Edit, Trash2, AlertCircle } from 'lucide-react';
import { useSistema } from '@/app/context/SistemaContext';
import { Empresa } from '@/app/types';
import ModalCadastrarEmpresa from './ModalCadastrarEmpresa';
import ModalBase from './ModalBase';

interface DetalhesDiretoModalProps {
  empresa: Empresa;
  onClose: () => void;
  onEditar: (empresa: Empresa) => void;
  onExcluir: (empresa: Empresa) => void;
  empresaEmEdicao: Empresa | null;
  setEmpresaEmEdicao: React.Dispatch<React.SetStateAction<Empresa | null>>;
}

function DetalhesDiretoModal({
  empresa,
  onClose,
  onEditar,
  onExcluir,
  empresaEmEdicao,
  setEmpresaEmEdicao,
}: DetalhesDiretoModalProps) {
  const handleClose = () => onClose();
  return (
    <div>
      <ModalBase
        isOpen
        onClose={handleClose}
        labelledBy="detalhes-empresa-title"
        dialogClassName="w-full max-w-4xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto m-4"
        zIndex={1065}
      >
        <div className="rounded-2xl">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <h3 id="detalhes-empresa-title" className="text-xl font-bold text-white">Detalhes da Empresa</h3>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h4 className="font-semibold text-green-800 mb-4">Informações Principais</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social</label>
                  <p className="text-gray-900 font-semibold">{empresa.razao_social}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <p className="text-gray-900 font-semibold">{empresa.codigo}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <p className="text-gray-900">{empresa.cnpj}</p>
                </div>
                {empresa.apelido && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                    <p className="text-gray-900">{empresa.apelido}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-4">Inscrições e Regimes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {empresa.inscricao_estadual && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Estadual (IE)</label>
                    <p className="text-gray-900 break-words">{empresa.inscricao_estadual}</p>
                  </div>
                )}
                {empresa.inscricao_municipal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inscrição Municipal (IM)</label>
                    <p className="text-gray-900 break-words">{empresa.inscricao_municipal}</p>
                  </div>
                )}
                {empresa.regime_federal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Regime Federal</label>
                    <p className="text-gray-900">{empresa.regime_federal}</p>
                  </div>
                )}
                {empresa.regime_estadual && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Regime Estadual</label>
                    <p className="text-gray-900 break-words">{empresa.regime_estadual}</p>
                  </div>
                )}
                {empresa.regime_municipal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Regime Municipal</label>
                    <p className="text-gray-900 break-words">{empresa.regime_municipal}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-4">Endereço</h4>
              <div className="space-y-2">
                {empresa.logradouro && (
                  <p className="text-gray-900">
                    {empresa.logradouro}
                    {empresa.numero && `, ${empresa.numero}`}
                  </p>
                )}
                {empresa.bairro && (
                  <p className="text-gray-900">
                    {empresa.bairro}
                    {empresa.cidade && empresa.estado && (
                      <> - {empresa.cidade}/{empresa.estado}</>
                    )}
                  </p>
                )}
                {empresa.cep && <p className="text-gray-900">CEP: {empresa.cep}</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onEditar(empresa)}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                Editar
              </button>
              <button
                onClick={() => onExcluir(empresa)}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        </div>
      </ModalBase>

      {empresaEmEdicao && (
        <ModalCadastrarEmpresa
          empresa={empresaEmEdicao}
          onClose={() => setEmpresaEmEdicao(null)}
        />
      )}
    </div>
  );
}

interface ModalListarEmpresasProps {
  onClose: () => void;
  tipo?: 'cadastradas' | 'nao-cadastradas';
  empresaIdInicial?: number;
}

export default function ModalListarEmpresas({
  onClose,
  tipo = 'cadastradas',
  empresaIdInicial,
}: ModalListarEmpresasProps) {
  const { empresas, excluirEmpresa, mostrarConfirmacao } = useSistema();
  const [buscaEmpresa, setBuscaEmpresa] = useState('');
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(() => {
    if (empresaIdInicial) {
      const emp = (empresas || []).find((e) => e.id === empresaIdInicial);
      return emp || null;
    }
    return null;
  });
  const [empresaEmEdicao, setEmpresaEmEdicao] = useState<Empresa | null>(null);
  const [autoDetalheConsumido, setAutoDetalheConsumido] = useState(false);
  const detalheDireto = Boolean(empresaIdInicial);

  // Sincronizar empresa selecionada com atualizações feitas no contexto
  React.useEffect(() => {
    if (!empresaSelecionada) return;
    const atualizada = (empresas || []).find((e) => e.id === empresaSelecionada.id);
    if (atualizada && atualizada !== empresaSelecionada) {
      setEmpresaSelecionada(atualizada);
    }
  }, [empresas, empresaSelecionada]);

  React.useEffect(() => {
    if (!empresaIdInicial || autoDetalheConsumido) return;
    const emp = (empresas || []).find((e) => e.id === empresaIdInicial);
    if (emp) {
      setEmpresaSelecionada(emp);
      setAutoDetalheConsumido(true);
    }
  }, [empresaIdInicial, empresas, autoDetalheConsumido]);

  const empresasFiltradas = (empresas || []).filter((empresa) => {
    const matchBusca =
      empresa.razao_social.toLowerCase().includes(buscaEmpresa.toLowerCase()) ||
      empresa.codigo.toLowerCase().includes(buscaEmpresa.toLowerCase()) ||
      (empresa.cnpj && empresa.cnpj.includes(buscaEmpresa));

    // Filtro mais robusto - considera boolean true/false
    let matchTipo = false;
    if (tipo === 'cadastradas') {
      matchTipo = empresa.cadastrada === true;
    } else {
      matchTipo = empresa.cadastrada === false || !empresa.cadastrada;
    }

    return matchBusca && matchTipo;
  });

  const formatarData = (data?: string) => {
    if (!data) return 'Não informada';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const recarregarEmpresas = () => {
    // Implementar lógica de recarregamento
  };

  const handleEditar = (empresa: Empresa) => {
    setEmpresaEmEdicao(empresa);
  };

  const handleExcluir = (empresa: Empresa) => {
    void (async () => {
      const ok = await mostrarConfirmacao({
        titulo: 'Excluir Empresa',
        mensagem: 'Tem certeza que deseja excluir esta empresa?\n\nEssa ação não poderá ser desfeita.',
        tipo: 'perigo',
        textoConfirmar: 'Sim, Excluir',
        textoCancelar: 'Cancelar',
      });

      if (ok) {
        excluirEmpresa(empresa.id);
        if (empresaSelecionada?.id === empresa.id) {
          if (detalheDireto) {
            onClose();
          } else {
            setEmpresaSelecionada(null);
          }
        }
      }
    })();
  };

  // Renderização condicional: quando chamado com empresaIdInicial, mostrar apenas Detalhes direto
  if (detalheDireto) {
    if (!empresaSelecionada) return null;
    return (
      <DetalhesDiretoModal
        empresa={empresaSelecionada}
        onClose={onClose}
        onEditar={handleEditar}
        onExcluir={handleExcluir}
        empresaEmEdicao={empresaEmEdicao}
        setEmpresaEmEdicao={setEmpresaEmEdicao}
      />
    );
  }

  return (
    <>
      {/* Modal Principal */}
      <ModalBase
        isOpen
        onClose={onClose}
        labelledBy="listar-empresas-title"
        dialogClassName="w-full max-w-6xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto"
        zIndex={1060}
      >
          {/* Header */}
          <div
            className={`bg-gradient-to-r ${
              tipo === 'cadastradas'
                ? 'from-blue-500 to-blue-600'
                : 'from-amber-500 to-orange-600'
            } p-6 rounded-t-2xl sticky top-0 z-10`}
          >
            <div className="flex justify-between items-center">
              <h3 id="listar-empresas-title" className="text-xl font-bold text-white">
                {tipo === 'cadastradas' ? 'Empresas Cadastradas' : 'Empresas Novas'} ({empresasFiltradas.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={recarregarEmpresas}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors"
                  title="Recarregar lista"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Busca */}
          <div className="p-6">
            <div className="mb-6">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Buscar por código, CNPJ ou razão social..."
                  value={buscaEmpresa}
                  onChange={(e) => setBuscaEmpresa(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-[var(--border)] rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[var(--card)] text-gray-900 dark:text-[var(--fg)]"
                />
              </div>
            </div>

            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empresasFiltradas.map((empresa) => (
                <div
                  key={empresa.id}
                  className="bg-white dark:bg-[var(--card)] rounded-xl p-4 border border-gray-200 dark:border-[var(--border)] hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-full"
                  onClick={() => setEmpresaSelecionada(empresa)}
                >
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="font-bold text-gray-900 dark:text-[var(--fg)] text-sm sm:text-base truncate max-w-[180px] md:max-w-[200px] lg:max-w-[220px] uppercase tracking-wide"
                          title={empresa.razao_social}
                        >
                          {empresa.razao_social}
                        </h4>

                        {empresa.apelido && (
                          <p
                            className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[180px] md:max-w-[200px] lg:max-w-[220px]"
                            title={empresa.apelido}
                          >
                            ({empresa.apelido})
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium shadow-sm">
                          {empresa.codigo}
                        </span>

                        {!empresa.cadastrada && (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                            <AlertCircle size={10} />
                            Nova
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 mb-2">
                      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        {empresa.codigo}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                      <p className="flex items-center gap-2">
                        <span className="text-gray-400">📄</span>
                        <span>{empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : 'CNPJ: não informado'}</span>
                      </p>
                      {empresa.cidade && empresa.estado && (
                        <p className="flex items-center gap-2">
                          <span className="">📍</span>
                          <span>
                            {empresa.cidade}/{empresa.estado}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmpresaSelecionada(empresa);
                      }}
                      className="w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {empresasFiltradas.length === 0 && (
              <div className="text-center py-12">
                <Building size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 dark:text-gray-300">Nenhuma empresa encontrada</p>
              </div>
            )}
          </div>
      </ModalBase>

      {empresaEmEdicao && (
        <ModalCadastrarEmpresa
          empresa={empresaEmEdicao}
          onClose={() => setEmpresaEmEdicao(null)}
        />
      )}

      {/* Modal de Detalhes */}
      {empresaSelecionada && (
        <ModalBase
          isOpen
          onClose={() => setEmpresaSelecionada(null)}
          labelledBy="detalhes-empresa-in-list-title"
          dialogClassName="w-full max-w-4xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none max-h-[90vh] overflow-y-auto m-4"
          zIndex={1065}
        >
          <div className="rounded-2xl">
            {/* Header Detalhes */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 id="detalhes-empresa-in-list-title" className="text-xl font-bold text-white">Detalhes da Empresa</h3>
                <button
                  onClick={() => setEmpresaSelecionada(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conteúdo Detalhes */}
            <div className="p-6 space-y-6">
              {/* Informações Principais */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-4">Informações Principais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razão Social
                    </label>
                    <p className="text-gray-900 font-semibold">
                      {empresaSelecionada.razao_social}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                    <p className="text-gray-900 font-semibold">{empresaSelecionada.codigo}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                    <p className="text-gray-900">{empresaSelecionada.cnpj}</p>
                  </div>
                  {empresaSelecionada.apelido && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Fantasia
                      </label>
                      <p className="text-gray-900">{empresaSelecionada.apelido}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Abertura
                    </label>
                    <p className="text-gray-900">
                      {formatarData(empresaSelecionada.data_abertura)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inscrições e Regimes */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-4">Inscrições e Regimes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {empresaSelecionada.inscricao_estadual && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inscrição Estadual (IE)
                      </label>
                      <p className="text-gray-900 break-words">
                        {empresaSelecionada.inscricao_estadual}
                      </p>
                    </div>
                  )}
                  {empresaSelecionada.inscricao_municipal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inscrição Municipal (IM)
                      </label>
                      <p className="text-gray-900 break-words">
                        {empresaSelecionada.inscricao_municipal}
                      </p>
                    </div>
                  )}
                  {empresaSelecionada.regime_federal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Regime Federal
                      </label>
                      <p className="text-gray-900">{empresaSelecionada.regime_federal}</p>
                    </div>
                  )}
                  {empresaSelecionada.regime_estadual && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Regime Estadual
                      </label>
                      <p className="text-gray-900 break-words">
                        {empresaSelecionada.regime_estadual}
                      </p>
                    </div>
                  )}
                  {empresaSelecionada.regime_municipal && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Regime Municipal
                      </label>
                      <p className="text-gray-900 break-words">
                        {empresaSelecionada.regime_municipal}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-4">Endereço</h4>
                <div className="space-y-2">
                  {empresaSelecionada.logradouro && (
                    <p className="text-gray-900">
                      {empresaSelecionada.logradouro}
                      {empresaSelecionada.numero && `, ${empresaSelecionada.numero}`}
                    </p>
                  )}
                  {empresaSelecionada.bairro && (
                    <p className="text-gray-900">
                      {empresaSelecionada.bairro}
                      {empresaSelecionada.cidade && empresaSelecionada.estado && (
                        <> - {empresaSelecionada.cidade}/{empresaSelecionada.estado}</>
                      )}
                    </p>
                  )}
                  {empresaSelecionada.cep && (
                    <p className="text-gray-900">CEP: {empresaSelecionada.cep}</p>
                  )}
                </div>
              </div>

              {/* Botões de Ação (Admin) */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleEditar(empresaSelecionada)}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Editar
                </button>
                <button
                  onClick={() => handleExcluir(empresaSelecionada)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </ModalBase>
      )}
    </>
  );
}