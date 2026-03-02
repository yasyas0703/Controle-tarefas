import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import { requireAuth } from '@/app/utils/routeAuth';
import { validarAvancoDepartamento } from '@/app/utils/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

// POST /api/processos/:id/avancar
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await requireAuth(request);
    if (!user) return error;

    const roleUpper = String((user as any).role || '').toUpperCase();
    if (roleUpper === 'USUARIO') {
      return NextResponse.json({ error: 'Sem permissÃ£o para avanÃ§ar processo' }, { status: 403 });
    }
    
    const bypassValidacoesObrigatorias = roleUpper === 'ADMIN' || roleUpper === 'ADMIN_DEPARTAMENTO';
    const processoId = parseInt(params.id);
    
    // Buscar processo completo com todas as informaÃ§Ãµes para validaÃ§Ã£o
    const processo = await prisma.processo.findUnique({
      where: { id: processoId },
      include: {
        historicoFluxos: {
          orderBy: { ordem: 'desc' },
          take: 1,
        },
        documentos: true,
        questionarios: {
          include: {
            respostas: true,
          },
        },
      },
    });
    
    if (!processo) {
      return NextResponse.json(
        { error: 'Processo nÃ£o encontrado' },
        { status: 404 }
      );
    }

    if (roleUpper === 'GERENTE') {
      const departamentoUsuarioRaw = (user as any).departamentoId ?? (user as any).departamento_id;
      const departamentoUsuario = Number.isFinite(Number(departamentoUsuarioRaw)) ? Number(departamentoUsuarioRaw) : undefined;
      if (typeof departamentoUsuario !== 'number') {
        return NextResponse.json({ error: 'UsuÃ¡rio sem departamento definido' }, { status: 403 });
      }
      if (processo.departamentoAtual !== departamentoUsuario) {
        return NextResponse.json({ error: 'Sem permissÃ£o para mover processo de outro departamento' }, { status: 403 });
      }
    }
    
    // Verificar se hÃ¡ prÃ³ximo departamento
    const proximoIndex = processo.departamentoAtualIndex + 1;
    if (!processo.fluxoDepartamentos || proximoIndex >= processo.fluxoDepartamentos.length) {
      return NextResponse.json(
        { error: 'Processo jÃ¡ estÃ¡ no Ãºltimo departamento' },
        { status: 400 }
      );
    }
    
    const proximoDepartamentoId = processo.fluxoDepartamentos[proximoIndex];
    const departamentoAtual = await prisma.departamento.findUnique({
      where: { id: processo.departamentoAtual },
      include: {
        documentosObrigatorios: true,
      },
    });
    const proximoDepartamento = await prisma.departamento.findUnique({
      where: { id: proximoDepartamentoId },
    });
    
    if (!proximoDepartamento || !departamentoAtual) {
      return NextResponse.json(
        { error: 'Departamento nÃ£o encontrado' },
        { status: 404 }
      );
    }
    
    // ============================================
    // VALIDAR REQUISITOS ANTES DE AVANÃ‡AR
    // ============================================
    
    if (!bypassValidacoesObrigatorias) {
      try {
        const questionarios = await prisma.questionarioDepartamento.findMany({
        where: {
          processoId: processoId,
          departamentoId: departamentoAtual.id,
        },
        orderBy: { ordem: 'asc' },
      });

      // Montar respostas do departamento atual
      // IMPORTANTE: sempre usar questionarioId como chave
      const respostasMap: Record<number, any> = {};
      const respostasQuestionario = await prisma.respostaQuestionario.findMany({
        where: {
          processoId: processoId,
          questionario: {
            departamentoId: departamentoAtual.id,
          },
        },
        include: {
          questionario: true,
        },
      });
      
      for (const respQuest of respostasQuestionario) {
        if (respQuest.resposta !== null && respQuest.resposta !== undefined) {
          // Sempre usar questionarioId como chave para manter consistÃªncia
          // O valor Ã© armazenado como string (JSON ou texto plano)
          let valor: any = respQuest.resposta;
          try {
            const parsed = JSON.parse(respQuest.resposta);
            // Se for um primitivo (string, number, boolean) ou array, usar o valor parseado
            // Se for um objeto com chaves numÃ©ricas (batch de respostas antigo), extrair cada uma
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              // Verificar se Ã© um batch de respostas (chaves sÃ£o IDs de perguntas)
              const keys = Object.keys(parsed);
              const allNumericKeys = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
              if (allNumericKeys) {
                // Batch: mapear cada chave individualmente
                for (const [k, v] of Object.entries(parsed)) {
                  respostasMap[Number(k)] = v;
                }
                continue; // JÃ¡ mapeamos, pular a atribuiÃ§Ã£o abaixo
              }
              valor = parsed;
            } else {
              valor = parsed;
            }
          } catch {
            // NÃ£o Ã© JSON, manter como string
          }
          respostasMap[respQuest.questionarioId] = valor;
        }
      }

      // Validar se todos os requisitos estÃ£o completos (somente se houver questionÃ¡rios ou documentos obrigatÃ³rios)
      if (questionarios.some(q => q.obrigatorio) || (departamentoAtual.documentosObrigatorios && departamentoAtual.documentosObrigatorios.length > 0)) {
        const validacao = validarAvancoDepartamento({
          processo,
          departamento: departamentoAtual,
          questionarios: questionarios.map(q => ({
            id: q.id,
            label: q.label || 'Pergunta',
            tipo: q.tipo as any || 'text',
            obrigatorio: q.obrigatorio || false,
            opcoes: Array.isArray(q.opcoes) ? q.opcoes : [],
            condicao: q.condicaoPerguntaId ? {
              perguntaId: q.condicaoPerguntaId,
              operador: (q.condicaoOperador as any) || 'igual',
              valor: q.condicaoValor || '',
            } : undefined,
          })),
          documentos: processo.documentos || [],
          respostas: respostasMap,
        });

        if (!validacao.valido) {
          // Retornar erros de validaÃ§Ã£o
          const errosCriticos = validacao.erros.filter(e => e.tipo === 'erro');
          return NextResponse.json(
            {
              error: 'Requisitos obrigatÃ³rios nÃ£o preenchidos',
              detalhes: errosCriticos.map(e => e.mensagem),
              validacao: validacao.erros,
            },
            { status: 400 }
          );
        }
      }
      } catch (validacaoError) {
        // Se a validação falhar, apenas logar e continuar (não bloquear o avanço)
        console.error('Erro na validação (não bloqueante):', validacaoError);
      }
    }
    
    // ============================================
    // VALIDAÃ‡ÃƒO PASSOU - AVANÃ‡AR PROCESSO
    // ============================================
    
    // Atualizar processo
    const processoAtualizado = await prisma.processo.update({
      where: { id: processoId },
      data: {
        departamentoAtual: proximoDepartamentoId,
        departamentoAtualIndex: proximoIndex,
        progresso: Math.round(((proximoIndex + 1) / processo.fluxoDepartamentos.length) * 100),
        dataAtualizacao: new Date(),
      },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
      },
    });
    
    // Marcar histÃ³rico de fluxo anterior como concluÃ­do
    const ultimoFluxo = processo.historicoFluxos[0];
    if (ultimoFluxo) {
      await prisma.historicoFluxo.update({
        where: { id: ultimoFluxo.id },
        data: {
          status: 'concluido',
          saidaEm: new Date(),
        },
      });
    }
    
    // Criar novo histÃ³rico de fluxo
    await prisma.historicoFluxo.create({
      data: {
        processoId: processoId,
        departamentoId: proximoDepartamentoId,
        ordem: proximoIndex,
        status: 'em_andamento',
        entradaEm: new Date(),
      },
    });
    
    // Criar evento de movimentaÃ§Ã£o
    await prisma.historicoEvento.create({
      data: {
        processoId: processoId,
        tipo: 'MOVIMENTACAO',
        acao: `Processo movido de "${departamentoAtual?.nome || 'N/A'}" para "${proximoDepartamento.nome}"`,
        responsavelId: user.id,
        departamento: proximoDepartamento.nome,
        dataTimestamp: BigInt(Date.now()),
      },
    });

    // Auto-atribuir responsÃ¡vel ao responsÃ¡vel do departamento destino
    try {
      // 1. Buscar gerente do departamento destino
      let novoResponsavel = await prisma.usuario.findFirst({
        where: {
          ativo: true,
          role: 'GERENTE',
          departamentoId: proximoDepartamentoId,
        },
        select: { id: true, nome: true },
      });

      // 2. Se nÃ£o hÃ¡ gerente, buscar pelo nome do responsÃ¡vel cadastrado no departamento
      if (!novoResponsavel && proximoDepartamento.responsavel) {
        novoResponsavel = await prisma.usuario.findFirst({
          where: {
            ativo: true,
            nome: { equals: proximoDepartamento.responsavel, mode: 'insensitive' },
          },
          select: { id: true, nome: true },
        });
      }

      // 3. Fallback: qualquer usuÃ¡rio ativo vinculado ao departamento
      if (!novoResponsavel) {
        novoResponsavel = await prisma.usuario.findFirst({
          where: {
            ativo: true,
            departamentoId: proximoDepartamentoId,
          },
          orderBy: { role: 'asc' }, // prioriza ADMIN > GERENTE > USUARIO
          select: { id: true, nome: true },
        });
      }

      if (novoResponsavel) {
        await prisma.processo.update({
          where: { id: processoId },
          data: { responsavelId: novoResponsavel.id },
        });
      }
    } catch {
      // NÃ£o bloquear avanÃ§o se falhar
    }

    // Criar notificaÃ§Ãµes persistidas: somente gerentes do dept destino e responsÃ¡vel do processo (se definido)
    try {
      const gerentesDestino = await prisma.usuario.findMany({
        where: {
          ativo: true,
          role: 'GERENTE',
          departamentoId: proximoDepartamentoId,
        },
        select: { id: true },
      });

      const ids = new Set<number>(gerentesDestino.map((u) => u.id));

      // responsÃ¡vel do processo (se existir)
      if (typeof (processoAtualizado as any).responsavelId === 'number') {
        ids.add((processoAtualizado as any).responsavelId);
      }

      // evita notificar quem moveu
      ids.delete(user.id);

      const destinatarios = Array.from(ids);
      if (destinatarios.length > 0) {
        const nomeEmpresa = processoAtualizado.nomeEmpresa || 'Empresa';
        const nomeServico = processoAtualizado.nomeServico ? ` - ${processoAtualizado.nomeServico}` : '';
        const mensagem = `Processo no seu departamento: ${nomeEmpresa}${nomeServico}`;

        await prisma.notificacao.createMany({
          data: destinatarios.map((id) => ({
            usuarioId: id,
            mensagem,
            tipo: 'INFO',
            processoId: processoId,
            link: `/`,
          })),
        });
      }
    } catch (e) {
      // NÃ£o derruba a movimentaÃ§Ã£o se notificaÃ§Ã£o falhar
      console.error('Erro ao criar notificaÃ§Ãµes de movimentaÃ§Ã£o:', e);
    }
    
    return NextResponse.json(processoAtualizado);
  } catch (error) {
    console.error('Erro ao avanÃ§ar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao avanÃ§ar processo' },
      { status: 500 }
    );
  }
}


