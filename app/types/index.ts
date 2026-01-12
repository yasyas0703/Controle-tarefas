// Types essenciais do sistema

export interface Processo {
  id: number;
  nome?: string;
  nomeServico?: string;
  nomeEmpresa?: string;
  cliente?: string;
  empresa?: string | Empresa;
  email?: string;
  telefone?: string;
  status: 'em_andamento' | 'finalizado' | 'pausado' | 'cancelado' | 'rascunho';
  prioridade: 'alta' | 'media' | 'baixa';
  departamentoAtual: number;
  departamentoAtualIndex?: number;
  fluxoDepartamentos?: number[];
  criadoEm: Date | string;
  dataCriacao?: Date | string;
  dataAtualizacao: Date | string;
  dataEntrega?: Date | string;
  dataInicio?: Date | string;
  dataFinalizacao?: Date | string;
  descricao?: string;
  tags?: number[];
  tagsMetadata?: Tag[];
  notasCriador?: string;
  historicoFluxo?: HistoricoFluxo[];
  historico?: HistoricoEvento[];
  historicoEvento?: HistoricoEvento[];
  questionarios?: Questionario[];
  questionariosPorDepartamento?: Record<number, Questionario[]>;
  questionarioSolicitacao?: Questionario[];
  documentos?: Documento[];
  comentarios?: Comentario[];
  comentariosCount?: number;
  criadoPor?: string;
  progresso?: number;
  respostasHistorico?: Record<number, RespostaQuestionario>;
  empresaId?: number;
  personalizado?: boolean;
  templateId?: number;
}

export interface Departamento {
  id: number;
  nome: string;
  responsavel?: string;
  descricao?: string;
  icone?: any;
  cor: string;
  corSolida?: string;
  ativo?: boolean;
  criadoEm?: Date | string;
  documentosObrigatorios?: DocumentoObrigatorio[];
  ordem?: number;
  permissoes?: string[];
  questionarios?: any[];
}

export interface Tag {
  id: number;
  nome: string;
  cor: string;
  texto?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: 'admin' | 'gerente' | 'usuario';
  departamento_id?: number;
  permissoes?: string[];
  ativo?: boolean;
  criadoEm?: Date | string;
}

export interface Notificacao {
  id: number;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'info' | 'aviso';
  timestamp: string;
  lida: boolean;
  origem?: 'db' | 'local';
  link?: string | null;
}

export interface Comentario {
  id: number;
  processoId: number;
  texto: string;
  autor: string;
  departamentoId?: number;
  departamento?: string;
  timestamp: Date | string;
  editado: boolean;
  editadoEm?: Date | string;
  mencoes?: string[];
}

export interface Documento {
  id: number;
  processoId: number;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  tipoCategoria?: string;
  departamentoId?: number;
  perguntaId?: number;
  dataUpload: Date | string;
}

export interface DocumentoObrigatorio {
  id: number;
  tipo: string;
  nome: string;
  descricao?: string;
}

export interface Questionario {
  id: number;
  label: string;
  tipo: 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'file' | 'phone' | 'email';
  obrigatorio: boolean;
  opcoes?: string[];
  ordem?: number;
  condicao?: {
    perguntaId: number;
    operador: 'igual' | 'diferente' | 'contem';
    valor: string;
  };
}

export interface RespostaQuestionario {
  departamentoId: number;
  departamentoNome: string;
  questionario: Questionario[];
  respostas: Record<number, any>;
  respondidoEm?: Date | string;
  respondidoPor?: string;
}

export interface HistoricoFluxo {
  departamento: number;
  ordem: number;
  status: string;
}

export interface HistoricoEvento {
  departamento: string;
  data: Date | string;
  dataTimestamp?: number;
  acao: string;
  responsavel: string;
  tipo:
    | 'inicio'
    | 'alteracao'
    | 'movimentacao'
    | 'conclusao'
    | 'finalizacao'
    | 'documento'
    | 'comentario';
}

export interface Empresa {
  id: number;
  cnpj: string;
  codigo: string;
  razao_social: string;
  apelido?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  regime_federal?: string;
  regime_estadual?: string;
  regime_municipal?: string;
  data_abertura?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  cep?: string;
  email?: string;
  telefone?: string;
  cadastrada: boolean;
  criado_em?: Date | string;
}

export interface Template {
  id: number;
  nome: string;
  descricao?: string;
  fluxo_departamentos: string; // JSON string
  questionarios_por_departamento: string; // JSON string
  criado_em: Date | string;
  criado_por?: number;
}
