import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { getAuthUser } from '@/app/utils/routeAuth';

// Função para converter data corretamente (evita problema de timezone)
function parseDate(value: string): Date {
  // Se for apenas data (YYYY-MM-DD), adiciona horário meio-dia para evitar mudança de dia por timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + 'T12:00:00');
  }
  return new Date(value);
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as any).message;
    if (typeof msg === 'string') return msg;
  }
  return '';
}

// GET - Buscar eventos do calendário com filtros
export async function GET(request: NextRequest) {
  try {
    // Verificar usuário logado para filtrar eventos privados
    const usuario = await getAuthUser(request);
    const usuarioId = usuario?.id || null;
    
    const { searchParams } = new URL(request.url);
    
    // Parâmetros de filtro
    const inicio = searchParams.get('inicio');
    const fim = searchParams.get('fim');
    const tipo = searchParams.get('tipo');
    const departamentoId = searchParams.get('departamentoId');
    const empresaId = searchParams.get('empresaId');
    const status = searchParams.get('status');
    const incluirProcessos = searchParams.get('incluirProcessos') === 'true';
    const incluirDocumentos = searchParams.get('incluirDocumentos') === 'true';
    
    let eventosFormatados: any[] = [];
    
    // Tentar buscar eventos do calendário (se a tabela existir)
    try {
      // Construir filtro
      const where: any = {};
      
      if (inicio) {
        where.dataInicio = { ...where.dataInicio, gte: parseDate(inicio) };
      }
      if (fim) {
        where.dataInicio = { ...where.dataInicio, lte: parseDate(fim) };
      }
      if (tipo) {
        where.tipo = tipo;
      }
      if (departamentoId) {
        where.departamentoId = Number(departamentoId);
      }
      if (empresaId) {
        where.empresaId = Number(empresaId);
      }
      if (status) {
        where.status = status;
      }
      
      // Filtrar eventos privados: só mostrar eventos públicos OU eventos privados do usuário logado
      if (usuarioId) {
        where.OR = [
          { privado: false },
          { privado: true, criadoPorId: usuarioId },
        ];
      } else {
        // Se não está logado, só eventos públicos
        where.privado = false;
      }
      
      // Buscar eventos do calendário
      const eventos = await (prisma as any).eventoCalendario.findMany({
        where,
        orderBy: { dataInicio: 'asc' },
      });
      
      // Converter para formato do frontend
      eventosFormatados = eventos.map((e: any) => ({
        id: e.id,
        titulo: e.titulo,
        descricao: e.descricao,
        tipo: e.tipo.toLowerCase(),
        status: e.status.toLowerCase(),
        dataInicio: e.dataInicio,
        dataFim: e.dataFim,
        diaInteiro: e.diaInteiro,
        cor: e.cor,
        processoId: e.processoId,
        empresaId: e.empresaId,
        departamentoId: e.departamentoId,
        criadoPorId: e.criadoPorId,
        privado: e.privado,
        recorrencia: e.recorrencia.toLowerCase(),
        recorrenciaFim: e.recorrenciaFim,
        alertaMinutosAntes: e.alertaMinutosAntes,
        criadoEm: e.criadoEm,
        atualizadoEm: e.atualizadoEm,
      }));
    } catch (e) {
      // Tabela ainda não existe, continuar sem eventos do calendário
      console.log('Tabela EventoCalendario ainda não existe');
    }
    
    // Se solicitado, incluir processos com prazo como eventos
    if (incluirProcessos && inicio && fim) {
      const processos = await prisma.processo.findMany({
        where: {
          dataEntrega: {
            gte: parseDate(inicio),
            lte: parseDate(fim),
          },
          status: { in: ['EM_ANDAMENTO', 'PAUSADO'] },
        },
        include: {
          empresa: { select: { razao_social: true, codigo: true } },
          departamentoAtualRel: { select: { nome: true, cor: true } },
        },
      });
      
      const eventosProcessos = processos.map((p: any) => {
        const hoje = new Date();
        const prazo = new Date(p.dataEntrega);
        const atrasado = prazo < hoje;
        
        return {
          id: `processo-${p.id}`,
          titulo: `📋 ${p.nomeServico || p.nome || 'Processo'} - ${p.empresa?.razao_social || p.nomeEmpresa}`,
          descricao: p.descricao,
          tipo: 'processo_prazo',
          status: atrasado ? 'atrasado' : 'pendente',
          dataInicio: p.dataEntrega,
          dataFim: null,
          diaInteiro: true,
          cor: atrasado ? '#EF4444' : (p.prioridade === 'ALTA' ? '#F59E0B' : '#3B82F6'),
          processoId: p.id,
          empresaId: p.empresaId,
          departamentoId: p.departamentoAtual,
          departamentoNome: p.departamentoAtualRel?.nome,
          criadoPorId: p.criadoPorId,
          recorrencia: 'unico',
          origem: 'processo',
          prioridade: p.prioridade.toLowerCase(),
        };
      });
      
      eventosFormatados = [...eventosFormatados, ...eventosProcessos];
    }
    
    // Se solicitado, incluir documentos de empresas vencendo como eventos
    if (incluirDocumentos && inicio && fim) {
      try {
        const documentos = await prisma.empresaDocumento.findMany({
          where: {
            validadeAte: {
              gte: new Date(inicio),
              lte: new Date(fim),
            },
          },
          include: {
            empresa: { select: { id: true, razao_social: true, codigo: true } },
          },
        });
        
        const eventosDocumentos = documentos.map((d: any) => {
          const hoje = new Date();
          const validade = new Date(d.validadeAte);
          const vencido = validade < hoje;
          
          return {
            id: `documento-${d.id}`,
            titulo: `📄 ${d.tipo} - ${d.empresa?.razao_social || 'Empresa'}`,
            descricao: d.descricao || `Documento: ${d.nome}`,
            tipo: 'documento_vencimento',
            status: vencido ? 'atrasado' : 'pendente',
            dataInicio: d.validadeAte,
            dataFim: null,
            diaInteiro: true,
            cor: vencido ? '#EF4444' : '#F59E0B',
            processoId: null,
            empresaId: d.empresaId,
            departamentoId: null,
            criadoPorId: null,
            recorrencia: 'unico',
            origem: 'documento',
            empresaNome: d.empresa?.razao_social,
          };
        });
        
        eventosFormatados = [...eventosFormatados, ...eventosDocumentos];
      } catch (e) {
        console.log('Erro ao buscar documentos:', e);
      }
    }
    
    // Ordenar todos os eventos por data
    eventosFormatados.sort((a: any, b: any) => 
      new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
    );
    
    return NextResponse.json(eventosFormatados);
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar eventos do calendário' },
      { status: 500 }
    );
  }
}

// POST - Criar novo evento
export async function POST(request: NextRequest) {
  try {
    // Pegar usuário logado
    const usuario = await getAuthUser(request);
    const usuarioId = usuario?.id || null;
    
    const body = await request.json();
    
    const {
      titulo,
      descricao,
      tipo,
      dataInicio,
      dataFim,
      diaInteiro,
      cor,
      processoId,
      empresaId,
      departamentoId,
      recorrencia,
      recorrenciaFim,
      alertaMinutosAntes,
      privado,
    } = body;
    
    if (!titulo || !dataInicio) {
      return NextResponse.json(
        { error: 'Título e data de início são obrigatórios' },
        { status: 400 }
      );
    }
    
    const evento = await (prisma as any).eventoCalendario.create({
      data: {
        titulo,
        descricao,
        tipo: (tipo || 'LEMBRETE').toUpperCase(),
        dataInicio: parseDate(dataInicio),
        dataFim: dataFim ? parseDate(dataFim) : null,
        diaInteiro: diaInteiro ?? false,
        cor,
        processoId: processoId ? Number(processoId) : null,
        empresaId: empresaId ? Number(empresaId) : null,
        departamentoId: departamentoId ? Number(departamentoId) : null,
        criadoPorId: usuarioId || null, // Sempre usar o usuário logado
        privado: privado ?? true, // Por padrão é privado
        recorrencia: (recorrencia || 'UNICO').toUpperCase(),
        recorrenciaFim: recorrenciaFim ? parseDate(recorrenciaFim) : null,
        alertaMinutosAntes: alertaMinutosAntes ?? 60,
      },
    });
    
    return NextResponse.json({
      ...evento,
      tipo: evento.tipo.toLowerCase(),
      status: evento.status.toLowerCase(),
      recorrencia: evento.recorrencia.toLowerCase(),
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar evento:', error);

    const code = (error as any)?.code as string | undefined;
    const message = getErrorMessage(error);

    let friendly = 'Erro ao criar evento.';
    if (code === 'P2021' || /EventoCalendario/i.test(message) && /does not exist|não existe/i.test(message)) {
      friendly = 'A tabela EventoCalendario não existe no banco ainda. Rode o SQL de criação da tabela.';
    } else if (/TipoEventoCalendario/i.test(message) && /invalid input value for enum/i.test(message)) {
      friendly = 'O enum TipoEventoCalendario no banco está desatualizado (faltando valores como SOLICITACAO). Rode o SQL de atualização do calendário.';
    }

    return NextResponse.json(
      { error: friendly },
      { status: 500 }
    );
  }
}
