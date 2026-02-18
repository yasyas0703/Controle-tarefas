# 🚀 Sistema TRIAR - Documentação Executiva

> **Sistema de Gestão de Processos e Fluxos de Trabalho**  
> Versão 1.0.0 | Última atualização: Fevereiro 2026

---

## 📌 Sumário Executivo

O **Sistema TRIAR** é uma plataforma web moderna desenvolvida para gerenciar processos empresariais, automatizar fluxos de trabalho entre departamentos e centralizar informações de empresas e documentos. O sistema permite rastreabilidade completa, colaboração em tempo real e análise de dados através de dashboards interativos.

---

## 🎯 Objetivos do Sistema

| Objetivo | Descrição |
|----------|-----------|
| **Centralização** | Unificar todos os processos em uma única plataforma |
| **Rastreabilidade** | Histórico completo de todas as ações e movimentações |
| **Automação** | Fluxos de trabalho automatizados entre departamentos |
| **Colaboração** | Comunicação integrada via comentários e menções |
| **Compliance** | Controle de documentos obrigatórios e prazos |
| **Análise** | Dashboards e relatórios para tomada de decisão |

---
## 🏗️ Arquitetura Técnica

### Stack de Tecnologias

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
├─────────────────────────────────────────────────────────────┤
│  Next.js 14      │  Framework React com SSR/SSG             │
│  React 18        │  Biblioteca de UI                        │
│  TypeScript      │  Tipagem estática para JavaScript        │
│  Tailwind CSS    │  Framework CSS utilitário                │
│  Lucide React    │  Biblioteca de ícones                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                 │
├─────────────────────────────────────────────────────────────┤
│  Next.js API     │  API Routes serverless                   │
│  Prisma ORM      │  Object-Relational Mapping               │
│  Zod             │  Validação de dados                      │
│  JWT             │  Autenticação via tokens                 │
│  bcrypt          │  Criptografia de senhas                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   INFRAESTRUTURA                             │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL      │  Banco de dados relacional               │
│  Supabase        │  Backend-as-a-Service (BaaS)             │
│  Supabase Storage│  Armazenamento de arquivos               │
│  Supabase Realtime│ Atualizações em tempo real             │
│  Vercel          │  Plataforma de deploy                    │
└─────────────────────────────────────────────────────────────┘
```

### Linguagens Utilizadas

| Linguagem | Uso | Percentual Aproximado |
|-----------|-----|----------------------|
| **TypeScript** | Frontend e Backend | ~85% |
| **JavaScript** | Scripts auxiliares | ~5% |
| **CSS** | Estilização (Tailwind) | ~5% |
| **SQL** | Migrations e queries | ~5% |

---

## 📦 Módulos do Sistema

### 1. 🔄 Gestão de Processos

O módulo principal do sistema, responsável por gerenciar todo o ciclo de vida de processos/solicitações.

**Funcionalidades:**
- ✅ Criar, editar e excluir processos
- ✅ Definir fluxo de departamentos personalizável
- ✅ Acompanhar progresso em tempo real (0-100%)
- ✅ Atribuir responsável por processo
- ✅ Sistema de prioridades (Alta, Média, Baixa)
- ✅ Filtros avançados (status, tags, departamento, busca)
- ✅ Visualização em cards ou lista


---

### 2. 🏢 Gestão de Departamentos

Configuração e gerenciamento dos departamentos que compõem o fluxo de trabalho.

**Funcionalidades:**
- ✅ Criar departamentos com cores e ícones personalizados
- ✅ Definir documentos obrigatórios por departamento
- ✅ Questionários específicos por etapa
- ✅ Ordenação do fluxo de trabalho
- ✅ Visualização em grid com contadores de processos

---

### 3. 🏭 Gestão de Empresas

Cadastro completo de empresas com integração de consulta de CNPJ.

**Funcionalidades:**
- ✅ Cadastro manual ou automático via CNPJ
- ✅ Consulta de dados na Receita Federal (API externa)
- ✅ Dados completos: razão social, endereço, regime tributário
- ✅ Separação entre empresas cadastradas e não-cadastradas
- ✅ Documentos da empresa com controle de validade
- ✅ Alertas de vencimento de documentos (configurável)

**Dados capturados:**
```
- CNPJ
- Razão Social / Nome Fantasia
- Inscrição Estadual / Municipal
- Regime Federal / Estadual / Municipal
- Data de Abertura
- Endereço completo (CEP, Estado, Cidade, Bairro, Logradouro, Número)
- E-mail e Telefone
```

---

### 4. 📄 Gestão de Documentos

Sistema completo de upload, organização e controle de documentos.

**Funcionalidades:**
- ✅ Upload de arquivos para Supabase Storage
- ✅ Vinculação a processos ou empresas
- ✅ Categorização por tipo (Contrato Social, CNPJ, etc.)
- ✅ Preview de documentos (PDF, imagens)
- ✅ Galeria de documentos do processo
- ✅ Download individual ou em lote
- ✅ Controle de validade com alertas

**Controle de Visibilidade:**
| Nível | Descrição |
|-------|-----------|
| Público | Visível para todos com acesso ao processo |
| Por Role | Visível apenas para roles específicas |
| Por Usuário | Visível apenas para usuários específicos |

---

### 5. 📋 Questionários Dinâmicos

Sistema de formulários configuráveis por departamento.

**Tipos de campos suportados:**
| Tipo | Ícone | Descrição |
|------|-------|-----------|
| Text | 📝 | Campo de texto simples |
| Textarea | 📄 | Área de texto multilinha |
| Number | 🔢 | Campo numérico |
| Date | 📅 | Seletor de data |
| Boolean | ✅ | Sim/Não |
| Select | 📋 | Lista de opções |
| Checkbox | ☑️ | Múltipla escolha |
| File | 📎 | Upload de arquivo |
| Phone | 📞 | Telefone com máscara |
| Email | ✉️ | E-mail com validação |

**Recursos avançados:**
- ✅ Perguntas condicionais (mostrar/ocultar baseado em respostas)
- ✅ Campos obrigatórios configuráveis
- ✅ Ordem customizável
- ✅ Histórico de respostas por departamento

---

### 6. 💬 Sistema de Comentários

Comunicação integrada dentro dos processos.

**Funcionalidades:**
- ✅ Comentários em processos
- ✅ Menções de usuários (@usuario)
- ✅ Respostas aninhadas (threads)
- ✅ Edição com marcação de "editado"
- ✅ Timestamp de criação
- ✅ Identificação de departamento do autor

---

### 7. 🔔 Sistema de Notificações

Alertas em tempo real para os usuários.

**Funcionalidades:**
- ✅ Notificações em tempo real (WebSocket)
- ✅ Notificações do navegador (Push)
- ✅ Tipos: sucesso, erro, info, aviso
- ✅ Marcar como lida (individual ou todas)
- ✅ Painel de notificações

**Gatilhos de notificação:**
- Novo processo criado
- Processo movido para seu departamento
- Menção em comentário
- Documento próximo ao vencimento
- Alterações em processos

---

### 8. 📅 Calendário

Agenda integrada para gestão de prazos e compromissos.

**Tipos de eventos:**
| Tipo | Descrição |
|------|-----------|
| Prazo de Processo | Data limite de processo |
| Solicitação | Solicitações agendadas |
| Obrigação Fiscal | Datas fiscais/tributárias |
| Vencimento de Documento | Alertas de validade |
| Reunião | Reuniões agendadas |
| Lembrete | Lembretes pessoais |
| Feriado | Feriados e dias não úteis |

**Recursos:**
- ✅ Eventos recorrentes (diário, semanal, mensal, anual)
- ✅ Alertas configuráveis (minutos antes)
- ✅ Eventos privados ou compartilhados
- ✅ Integração com processos e empresas
- ✅ Visualização por mês/semana/dia

---

### 9. 📝 Templates de Processo

Modelos pré-configurados para agilizar a criação de processos.

**Funcionalidades:**
- ✅ Criar templates com fluxos pré-definidos
- ✅ Questionários salvos por departamento
- ✅ Reutilização para novos processos

---

### 10. 🏷️ Sistema de Tags

Categorização flexível de processos.

**Funcionalidades:**
- ✅ Criar tags com nome e cor
- ✅ Aplicar múltiplas tags por processo
- ✅ Filtrar processos por tags
- ✅ Gerenciamento centralizado


---

### 11. 📊 Analytics e Dashboard

Visualização de dados e métricas do sistema.

**Métricas disponíveis:**
- ✅ Total de processos por status
- ✅ Processos por departamento
- ✅ Processos por prioridade
- ✅ Taxa de conclusão
- ✅ Tempo médio por departamento
- ✅ Alertas de processos atrasados

---

### 12. 📜 Auditoria e Histórico

Rastreabilidade completa de todas as ações.

**Eventos registrados:**
| Tipo | Descrição |
|------|-----------|
| INICIO | Criação do processo |
| ALTERACAO | Modificação de dados |
| MOVIMENTACAO | Mudança de departamento |
| CONCLUSAO | Conclusão de etapa |
| FINALIZACAO | Finalização do processo |
| DOCUMENTO | Upload/remoção de documento |
| COMENTARIO | Adição de comentário |

**Dados registrados:**
- Quem executou a ação
- Quando foi executada
- Qual departamento estava
- Detalhes da alteração

---

## 👥 Controle de Acesso

### Níveis de Permissão

| Role | Permissões |
|------|------------|
| **Admin** | Acesso total: gerenciar usuários, departamentos, configurações |
| **Gerente** | Gerenciar processos, visualizar analytics, aprovar documentos |
| **Usuário** | Criar e acompanhar processos do seu departamento |

### Segurança

- 🔐 Autenticação via JWT (JSON Web Token)
- 🔒 Senhas criptografadas com bcrypt
- 🛡️ Validação de dados com Zod
- 🔑 Permissões granulares por usuário
- 🚫 Proteção contra CSRF e XSS

---

## 🔄 Fluxo de Trabalho Típico

```

```

1. **Criação**: Usuário cria processo selecionando empresa e fluxo
2. **Primeiro Departamento**: Preenche questionário e anexa documentos
3. **Avanço**: Processo avança para próximo departamento
4. **Notificação**: Responsáveis são notificados
5. **Continuidade**: Cada departamento executa suas tarefas
6. **Conclusão**: Processo é finalizado após passar por todos os departamentos

---

## 📱 Interface do Usuário

### Telas Principais

| Tela | Descrição |
|------|-----------|
| **Login** | Autenticação de usuários |
| **Dashboard** | Visão geral com estatísticas e alertas |
| **Grid de Departamentos** | Visualização do fluxo com contadores |
| **Lista de Processos** | Todos os processos com filtros |
| **Detalhes do Processo** | Informações completas + timeline |
| **Calendário** | Agenda de eventos e prazos |

### Modais/Janelas

- Modal de Login
- Modal de Nova Empresa
- Modal de Cadastrar Empresa (CNPJ)
- Modal de Listar Empresas
- Modal de Gerenciar Usuários
- Modal de Gerenciar Tags
- Modal de Criar Departamento
- Modal de Selecionar Template
- Modal de Questionário
- Modal de Comentários
- Modal de Upload de Documento
- Modal de Galeria de Documentos
- Modal de Preview de Documento
- Modal de Analytics
- Modal de Confirmação
- Modal de Alerta

---

## 📈 Benefícios do Sistema

### Para a Empresa
- 📉 **Redução de erros** com validações automáticas
- ⏱️ **Economia de tempo** com automação de fluxos
- 📊 **Visibilidade total** dos processos
- 📋 **Compliance** com documentos obrigatórios
- 🔍 **Rastreabilidade** completa de ações

### Para os Colaboradores
- 🎯 **Clareza** sobre tarefas pendentes
- 🔔 **Notificações** em tempo real
- 💬 **Comunicação** centralizada
- 📱 **Acesso** de qualquer lugar

### Para a Gestão
- 📊 **Métricas** para tomada de decisão
- 👥 **Controle** de equipe e produtividade
- 📅 **Gestão** de prazos e compromissos
- 🔐 **Segurança** dos dados





limpar banco- comando
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS"}' ; npx ts-node scripts/limpar-banco.ts


criar ususarios do zero
$env:TS_NODE_COMPILER_OPTIONS = '{"module":"CommonJS"}' ; npx ts-node prisma/seed.ts