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
  comentariosCount?: number;
  documentosCount?: number;
  questionarios?: Questionario[];
  questionariosPorDepartamento?: Record<number, Questionario[]>;
  questionarioSolicitacao?: Questionario[];
  documentos?: Documento[];
  comentarios?: Comentario[];
  criadoPor?: string;
  progresso?: number;
  respostasHistorico?: Record<number, RespostaQuestionario>;
  empresaId?: number;
  personalizado?: boolean;
  templateId?: number;
  responsavelId?: number;
  responsavel?: Pick<Usuario, 'id' | 'nome' | 'email'>;
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
  departamentoId?: number;
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
  processoId?: number | null;
}

export interface Comentario {
  id: number;
  processoId: number;
  texto: string;
  autor: string;
  autorId?: number;
  departamentoId?: number;
  departamento?: string;
  timestamp: Date | string;
  editado: boolean;
  editadoEm?: Date | string;
  mencoes?: string[];
  parentId?: number | null;
  respostas?: Comentario[];
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
  tipo: 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'checkbox' | 'file' | 'phone' | 'email';
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

export type EmpresaDocumentoValidadeStatus = 'sem_validade' | 'ok' | 'vence_em_breve' | 'vencido';

export interface EmpresaDocumento {
  id: number;
  empresaId: number;
  nome: string;
  tipo: string;
  descricao?: string | null;
  tamanho: number | string;
  url: string;
  path?: string | null;
  dataUpload: Date | string;
  uploadPorId?: number | null;
  validadeAte?: Date | string | null;
  alertarDiasAntes?: number;
  // Computados pela API
  validadeStatus?: EmpresaDocumentoValidadeStatus;
  validadeDias?: number | null;
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

// ==================== CALENDÁRIO ====================

export type TipoEventoCalendario = 
  | 'processo_prazo'      // Prazo de processo
  | 'solicitacao'         // Solicitação com prazo de entrega
  | 'obrigacao_fiscal'    // DAS, DCTF, SPED, etc
  | 'documento_vencimento'// Alvará, Certificado Digital vencendo
  | 'reuniao'             // Reunião com cliente
  | 'lembrete'            // Lembrete customizado
  | 'feriado';            // Feriados

export type StatusEventoCalendario = 'pendente' | 'concluido' | 'atrasado' | 'cancelado';

export type RecorrenciaEvento = 'unico' | 'diario' | 'semanal' | 'mensal' | 'anual';

export interface EventoCalendario {
  id: number;
  titulo: string;
  descricao?: string | null;
  tipo: TipoEventoCalendario;
  status: StatusEventoCalendario;
  dataInicio: Date | string;
  dataFim?: Date | string | null;
  diaInteiro: boolean;
  cor?: string | null;
  
  // Relacionamentos
  processoId?: number | null;
  empresaId?: number | null;
  departamentoId?: number | null;
  criadoPorId?: number | null;
  
  // Recorrência
  recorrencia: RecorrenciaEvento;
  recorrenciaFim?: Date | string | null;
  
  // Alertas
  alertaMinutosAntes?: number | null;
  
  // Metadados
  criadoEm: Date | string;
  atualizadoEm: Date | string;
  
  // Relações expandidas (opcionais)
  processo?: Processo;
  empresa?: Empresa;
  departamento?: Departamento;
  criadoPor?: Usuario;
}

export interface ObrigacaoFiscal {
  id: string;
  nome: string;
  descricao: string;
  diaVencimento: number; // Dia do mês
  regimes: ('simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei')[];
  periodicidade: 'mensal' | 'trimestral' | 'anual';
  cor: string;
}

// Obrigações fiscais pré-definidas
export const OBRIGACOES_FISCAIS: ObrigacaoFiscal[] = [
  { id: 'das', nome: 'DAS', descricao: 'Documento de Arrecadação do Simples Nacional', diaVencimento: 20, regimes: ['simples_nacional'], periodicidade: 'mensal', cor: '#10B981' },
  { id: 'dctf', nome: 'DCTF', descricao: 'Declaração de Débitos e Créditos Tributários Federais', diaVencimento: 15, regimes: ['lucro_presumido', 'lucro_real'], periodicidade: 'mensal', cor: '#3B82F6' },
  { id: 'sped_fiscal', nome: 'SPED Fiscal', descricao: 'Escrituração Fiscal Digital ICMS/IPI', diaVencimento: 20, regimes: ['lucro_presumido', 'lucro_real'], periodicidade: 'mensal', cor: '#8B5CF6' },
  { id: 'sped_contribuicoes', nome: 'SPED Contribuições', descricao: 'Escrituração Fiscal Digital PIS/COFINS', diaVencimento: 15, regimes: ['lucro_presumido', 'lucro_real'], periodicidade: 'mensal', cor: '#EC4899' },
  { id: 'gfip', nome: 'GFIP/SEFIP', descricao: 'Guia de Recolhimento do FGTS', diaVencimento: 7, regimes: ['simples_nacional', 'lucro_presumido', 'lucro_real'], periodicidade: 'mensal', cor: '#F59E0B' },
  { id: 'inss', nome: 'INSS', descricao: 'Contribuição Previdenciária', diaVencimento: 20, regimes: ['simples_nacional', 'lucro_presumido', 'lucro_real'], periodicidade: 'mensal', cor: '#EF4444' },
  { id: 'fgts', nome: 'FGTS', descricao: 'Fundo de Garantia por Tempo de Serviço', diaVencimento: 7, regimes: ['simples_nacional', 'lucro_presumido', 'lucro_real'], periodicidade: 'mensal', cor: '#06B6D4' },
  { id: 'irpj', nome: 'IRPJ', descricao: 'Imposto de Renda Pessoa Jurídica', diaVencimento: 30, regimes: ['lucro_presumido', 'lucro_real'], periodicidade: 'trimestral', cor: '#6366F1' },
  { id: 'csll', nome: 'CSLL', descricao: 'Contribuição Social sobre Lucro Líquido', diaVencimento: 30, regimes: ['lucro_presumido', 'lucro_real'], periodicidade: 'trimestral', cor: '#A855F7' },
  { id: 'das_mei', nome: 'DAS-MEI', descricao: 'Documento de Arrecadação do MEI', diaVencimento: 20, regimes: ['mei'], periodicidade: 'mensal', cor: '#22C55E' },
  { id: 'dirf', nome: 'DIRF', descricao: 'Declaração do Imposto de Renda Retido na Fonte', diaVencimento: 28, regimes: ['simples_nacional', 'lucro_presumido', 'lucro_real'], periodicidade: 'anual', cor: '#F97316' },
  { id: 'rais', nome: 'RAIS', descricao: 'Relação Anual de Informações Sociais', diaVencimento: 31, regimes: ['simples_nacional', 'lucro_presumido', 'lucro_real'], periodicidade: 'anual', cor: '#14B8A6' },
  { id: 'ecf', nome: 'ECF', descricao: 'Escrituração Contábil Fiscal', diaVencimento: 31, regimes: ['lucro_presumido', 'lucro_real'], periodicidade: 'anual', cor: '#84CC16' },
  { id: 'ecd', nome: 'ECD', descricao: 'Escrituração Contábil Digital', diaVencimento: 31, regimes: ['lucro_presumido', 'lucro_real'], periodicidade: 'anual', cor: '#0EA5E9' },
];

// Feriados nacionais fixos
export const FERIADOS_NACIONAIS = [
  { dia: 1, mes: 1, nome: 'Confraternização Universal' },
  { dia: 21, mes: 4, nome: 'Tiradentes' },
  { dia: 1, mes: 5, nome: 'Dia do Trabalho' },
  { dia: 7, mes: 9, nome: 'Independência do Brasil' },
  { dia: 12, mes: 10, nome: 'Nossa Senhora Aparecida' },
  { dia: 2, mes: 11, nome: 'Finados' },
  { dia: 15, mes: 11, nome: 'Proclamação da República' },
  { dia: 25, mes: 12, nome: 'Natal' },
];
