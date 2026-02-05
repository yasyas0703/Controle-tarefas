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
      return NextResponse.json({ error: 'Sem permissão para avançar processo' }, { status: 403 });
    }
    
    const processoId = parseInt(params.id);
    
    // Buscar processo completo com todas as informações para validação
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
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }

    if (roleUpper === 'GERENTE') {
      const departamentoUsuarioRaw = (user as any).departamentoId ?? (user as any).departamento_id;
      const departamentoUsuario = Number.isFinite(Number(departamentoUsuarioRaw)) ? Number(departamentoUsuarioRaw) : undefined;
      if (typeof departamentoUsuario !== 'number') {
        return NextResponse.json({ error: 'Usuário sem departamento definido' }, { status: 403 });
      }
      if (processo.departamentoAtual !== departamentoUsuario) {
        return NextResponse.json({ error: 'Sem permissão para mover processo de outro departamento' }, { status: 403 });
      }
    }
    
    // Verificar se há próximo departamento
    const proximoIndex = processo.departamentoAtualIndex + 1;
    if (!processo.fluxoDepartamentos || proximoIndex >= processo.fluxoDepartamentos.length) {
      return NextResponse.json(
        { error: 'Processo já está no último departamento' },
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
        { error: 'Departamento não encontrado' },
        { status: 404 }
      );
    }
    
    // ============================================
    // VALIDAR REQUISITOS ANTES DE AVANÇAR
    // ============================================
    
    try {
      const questionarios = await prisma.questionarioDepartamento.findMany({
        where: {
          processoId: processoId,
          departamentoId: departamentoAtual.id,
        },
        orderBy: { ordem: 'asc' },
      });

      // Montar respostas do departamento atual
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
        if (respQuest.resposta) {
          try {
            const parsed = typeof respQuest.resposta === 'string' ? JSON.parse(respQuest.resposta) : respQuest.resposta;
            if (typeof parsed === 'object' && parsed !== null) {
              Object.assign(respostasMap, parsed);
            } else {
              // Se não for objeto, usar o questionarioId como chave
              respostasMap[respQuest.questionarioId] = parsed;
            }
          } catch {
            // Se não for JSON, usar o valor direto
            respostasMap[respQuest.questionarioId] = respQuest.resposta;
          }
        }
      }

      // Validar se todos os requisitos estão completos (somente se houver questionários ou documentos obrigatórios)
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
          })),
          documentos: processo.documentos || [],
          respostas: respostasMap,
        });

        if (!validacao.valido) {
          // Retornar erros de validação
          const errosCriticos = validacao.erros.filter(e => e.tipo === 'erro');
          return NextResponse.json(
            {
              error: 'Requisitos obrigatórios não preenchidos',
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
    
    // ============================================
    // VALIDAÇÃO PASSOU - AVANÇAR PROCESSO
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
    
    // Marcar histórico de fluxo anterior como concluído
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
    
    // Criar novo histórico de fluxo
    await prisma.historicoFluxo.create({
      data: {
        processoId: processoId,
        departamentoId: proximoDepartamentoId,
        ordem: proximoIndex,
        status: 'em_andamento',
        entradaEm: new Date(),
      },
    });
    
    // Criar evento de movimentação
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

    // Criar notificações persistidas: somente gerentes do dept destino e responsável do processo (se definido)
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

      // responsável do processo (se existir)
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
      // Não derruba a movimentação se notificação falhar
      console.error('Erro ao criar notificações de movimentação:', e);
    }
    
    return NextResponse.json(processoAtualizado);
  } catch (error) {
    console.error('Erro ao avançar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao avançar processo' },
      { status: 500 }
    );
  }
}

