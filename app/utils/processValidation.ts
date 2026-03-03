import { prisma } from '@/app/utils/prisma';
import { validarAvancoDepartamento, type ResultadoValidacao } from '@/app/utils/validation';

type ProcessoValidacaoBase = {
  id: number;
  prioridade: string;
  dataEntrega: Date | null;
  departamentoAtual: number;
  departamentoAtualIndex: number;
  fluxoDepartamentos: number[];
  deptIndependente: boolean;
};

type ResultadoValidacaoDepartamento = {
  encontrado: boolean;
  valido: boolean;
  status: number;
  departamentoId: number;
  departamentoNome: string;
  validacao: ResultadoValidacao;
};

function mapRespostasQuestionario(respostasQuestionario: any[]) {
  const respostasMap: Record<number, any> = {};

  for (const respQuest of Array.isArray(respostasQuestionario) ? respostasQuestionario : []) {
    if (respQuest?.resposta === null || respQuest?.resposta === undefined) continue;

    let valor: any = respQuest.resposta;

    try {
      const parsed = JSON.parse(respQuest.resposta);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        const allNumericKeys = keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
        if (allNumericKeys) {
          for (const [key, nestedValue] of Object.entries(parsed)) {
            respostasMap[Number(key)] = nestedValue;
          }
          continue;
        }
      }
      valor = parsed;
    } catch {
      // Mantem texto plano.
    }

    respostasMap[Number(respQuest.questionarioId)] = valor;
  }

  return respostasMap;
}

function mapQuestionariosParaValidacao(questionarios: any[]) {
  return (Array.isArray(questionarios) ? questionarios : []).map((questionario: any) => ({
    id: questionario.id,
    label: questionario.label || 'Pergunta',
    tipo: questionario.tipo as any,
    obrigatorio: Boolean(questionario.obrigatorio),
    opcoes: Array.isArray(questionario.opcoes) ? questionario.opcoes : [],
    condicao: questionario.condicaoPerguntaId
      ? {
          perguntaId: questionario.condicaoPerguntaId,
          operador: questionario.condicaoOperador || 'igual',
          valor: questionario.condicaoValor || '',
        }
      : undefined,
  }));
}

async function loadProcessoValidacaoBase(processoId: number) {
  return prisma.processo.findUnique({
    where: { id: processoId },
    select: {
      id: true,
      prioridade: true,
      dataEntrega: true,
      departamentoAtual: true,
      departamentoAtualIndex: true,
      fluxoDepartamentos: true,
      deptIndependente: true,
    },
  }) as Promise<ProcessoValidacaoBase | null>;
}

export async function validarDepartamentoProcesso(
  processoId: number,
  departamentoId: number,
  processoBase?: ProcessoValidacaoBase | null
): Promise<ResultadoValidacaoDepartamento> {
  const processo = processoBase ?? (await loadProcessoValidacaoBase(processoId));

  if (!processo) {
    return {
      encontrado: false,
      valido: false,
      status: 404,
      departamentoId,
      departamentoNome: `Dept #${departamentoId}`,
      validacao: {
        valido: false,
        erros: [{ campo: 'processo', mensagem: 'Processo não encontrado', tipo: 'erro' }],
      },
    };
  }

  const [departamento, questionarios, respostasQuestionario, documentos] = await Promise.all([
    prisma.departamento.findUnique({
      where: { id: departamentoId },
      include: { documentosObrigatorios: true },
    }),
    prisma.questionarioDepartamento.findMany({
      where: { processoId, departamentoId },
      orderBy: { ordem: 'asc' },
    }),
    prisma.respostaQuestionario.findMany({
      where: {
        processoId,
        questionario: { departamentoId },
      },
      select: {
        questionarioId: true,
        resposta: true,
      },
    }),
    prisma.documento.findMany({
      where: { processoId },
      select: {
        id: true,
        tipo: true,
        tipoCategoria: true,
        perguntaId: true,
        departamentoId: true,
      },
    }),
  ]);

  if (!departamento) {
    return {
      encontrado: false,
      valido: false,
      status: 404,
      departamentoId,
      departamentoNome: `Dept #${departamentoId}`,
      validacao: {
        valido: false,
        erros: [{ campo: 'departamento', mensagem: 'Departamento não encontrado', tipo: 'erro' }],
      },
    };
  }

  const validacao = validarAvancoDepartamento({
    processo,
    departamento,
    questionarios: mapQuestionariosParaValidacao(questionarios),
    documentos,
    respostas: mapRespostasQuestionario(respostasQuestionario),
  });

  return {
    encontrado: true,
    valido: validacao.valido,
    status: validacao.valido ? 200 : 400,
    departamentoId,
    departamentoNome: departamento.nome,
    validacao,
  };
}

export async function validarProcessoParaFinalizacao(processoId: number) {
  const processo = await loadProcessoValidacaoBase(processoId);

  if (!processo) {
    return {
      encontrado: false,
      valido: false,
      status: 404,
      detalhes: ['Processo não encontrado'],
      erros: [] as Array<{ departamentoId: number; departamentoNome: string; mensagem: string }>,
    };
  }

  const fluxo = (Array.isArray(processo.fluxoDepartamentos) ? processo.fluxoDepartamentos : [])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);

  const departamentoIds =
    processo.deptIndependente && fluxo.length > 0
      ? fluxo
      : [Number(processo.departamentoAtual)];

  const erros: Array<{ departamentoId: number; departamentoNome: string; mensagem: string }> = [];

  for (const departamentoId of departamentoIds) {
    const resultado = await validarDepartamentoProcesso(processoId, departamentoId, processo);
    if (!resultado.encontrado) {
      return {
        encontrado: false,
        valido: false,
        status: resultado.status,
        detalhes: resultado.validacao.erros.map((erro) => erro.mensagem),
        erros: [],
      };
    }

    for (const erro of resultado.validacao.erros.filter((item) => item.tipo === 'erro')) {
      erros.push({
        departamentoId: resultado.departamentoId,
        departamentoNome: resultado.departamentoNome,
        mensagem:
          departamentoIds.length > 1
            ? `${resultado.departamentoNome}: ${erro.mensagem}`
            : erro.mensagem,
      });
    }
  }

  return {
    encontrado: true,
    valido: erros.length === 0,
    status: erros.length === 0 ? 200 : 400,
    detalhes: erros.map((erro) => erro.mensagem),
    erros,
  };
}
