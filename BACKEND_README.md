# 🔧 BACK-END COMPLETO - Sistema de Abertura de Empresas

Este documento descreve todo o back-end implementado seguindo o PLANO_DESENVOLVIMENTO.md.

## 📦 Estrutura Implementada

### 1. Configuração e Utilitários

#### ✅ Schema Prisma (`prisma/schema.prisma`)
- Schema completo com todas as tabelas e relacionamentos
- Enums: Role, Status, Prioridade, TipoCampo, TipoEvento, TipoNotificacao
- Índices otimizados para performance

#### ✅ Cliente Prisma (`app/utils/prisma.ts`)
- Singleton do Prisma Client para evitar múltiplas conexões
- Logs configurados para desenvolvimento

#### ✅ Autenticação (`app/utils/auth.ts`)
- Hash de senhas com bcrypt
- Geração e verificação de JWT tokens
- Função para buscar usuário do token

#### ✅ Supabase Storage (`app/utils/supabase.ts`)
- Upload de arquivos
- Delete de arquivos
- Integração com bucket do Supabase

#### ✅ Middleware (`app/middleware.ts`)
- Autenticação automática em todas as rotas `/api`
- Extração de dados do usuário dos headers
- Rotas públicas configuradas

---

## 🔐 API Routes - Autenticação

### `/api/auth/login` (POST)
- Login de usuário
- Retorna token JWT e dados do usuário
- Define cookie httpOnly

---

## 📋 API Routes - Processos

### `/api/processos` (GET, POST)
- **GET**: Lista processos com filtros (status, departamentoId, empresaId)
- **POST**: Cria novo processo com histórico inicial

### `/api/processos/[id]` (GET, PUT, DELETE)
- **GET**: Busca processo completo com todas as relações
- **PUT**: Atualiza processo e registra mudanças no histórico
- **DELETE**: Exclui processo (apenas ADMIN)

### `/api/processos/[id]/avancar` (POST)
- Avança processo para próximo departamento
- Atualiza progresso
- Cria histórico de fluxo
- Marca como concluído se for último departamento

### `/api/processos/[id]/tags` (POST, DELETE)
- **POST**: Adiciona tag ao processo
- **DELETE**: Remove tag do processo

---

## 🏢 API Routes - Departamentos

### `/api/departamentos` (GET, POST)
- **GET**: Lista departamentos ativos ordenados
- **POST**: Cria novo departamento

### `/api/departamentos/[id]` (GET, PUT, DELETE)
- **GET**: Busca departamento com questionários e documentos obrigatórios
- **PUT**: Atualiza departamento
- **DELETE**: Desativa departamento (soft delete)

---

## 🏭 API Routes - Empresas

### `/api/empresas` (GET, POST)
- **GET**: Lista empresas com busca e filtros
- **POST**: Cria nova empresa (valida CNPJ)

### `/api/empresas/[id]` (GET, PUT, DELETE)
- **GET**: Busca empresa com processos relacionados
- **PUT**: Atualiza empresa
- **DELETE**: Exclui empresa

---

## 🏷️ API Routes - Tags

### `/api/tags` (GET, POST)
- **GET**: Lista todas as tags
- **POST**: Cria nova tag

### `/api/tags/[id]` (PUT, DELETE, POST)
- **PUT**: Atualiza tag
- **DELETE**: Exclui tag
- **POST**: Adiciona tag a processo

---

## 💬 API Routes - Comentários

### `/api/comentarios` (GET, POST)
- **GET**: Lista comentários de um processo
- **POST**: Cria novo comentário

### `/api/comentarios/[id]` (PUT, DELETE)
- **PUT**: Atualiza comentário (apenas autor)
- **DELETE**: Exclui comentário (autor ou ADMIN)

---

## 📄 API Routes - Documentos

### `/api/documentos` (GET, POST)
- **GET**: Lista documentos de um processo
- **POST**: Upload de documento (Supabase Storage)

### `/api/documentos/[id]` (DELETE)
- **DELETE**: Exclui documento (autor ou ADMIN)

---

## 📝 API Routes - Questionários

### `/api/questionarios` (GET, POST)
- **GET**: Lista questionários de um departamento
- **POST**: Cria nova pergunta/questionário

### `/api/questionarios/respostas/[processoId]/[departamentoId]` (GET)
- **GET**: Busca respostas de um processo/departamento

### `/api/questionarios/salvar-respostas` (POST)
- **POST**: Salva/atualiza múltiplas respostas

---

## 📑 API Routes - Templates

### `/api/templates` (GET, POST)
- **GET**: Lista todos os templates
- **POST**: Cria novo template

### `/api/templates/[id]` (GET, DELETE)
- **GET**: Busca template específico
- **DELETE**: Exclui template

---

## 👥 API Routes - Usuários

### `/api/usuarios` (GET, POST)
- **GET**: Lista todos os usuários
- **POST**: Cria novo usuário (apenas ADMIN)

### `/api/usuarios/me` (GET)
- **GET**: Retorna dados do usuário logado

---

## 🔔 API Routes - Notificações

### `/api/notificacoes` (GET, POST)
- **GET**: Lista notificações do usuário (pode filtrar não lidas)
- **POST**: Cria nova notificação

### `/api/notificacoes/[id]/marcar-lida` (PATCH)
- **PATCH**: Marca notificação como lida

---

## 📊 API Routes - Analytics

### `/api/analytics` (GET)
- **GET**: Retorna estatísticas do sistema:
  - Total de processos
  - Processos por status
  - Processos por departamento
  - Processos criados/finalizados no período
  - Tempo médio por departamento
  - Taxa de conclusão

---

## 🗄️ Scripts

### `prisma/seed.ts`
- Seed inicial do banco de dados
- Cria usuário admin (admin@example.com / admin123)
- Cria departamentos padrão
- Cria tags padrão
- Cria usuário de exemplo

### `prisma/create_tables.sql`
- **SCRIPT SQL COMPLETO** para criação de todas as tabelas
- Inclui enums, tabelas, índices e foreign keys
- Pode ser executado diretamente no Supabase SQL Editor

---

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
SUPABASE_SERVICE_ROLE_KEY="..."
JWT_SECRET="..."
```

### 3. Executar Migrations (Prisma)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. OU Executar Script SQL Direto

1. Acesse o SQL Editor no Supabase Dashboard
2. Cole o conteúdo de `prisma/create_tables.sql`
3. Execute

### 5. Popular Banco com Dados Iniciais

```bash
npm run prisma:seed
```

### 6. Iniciar Servidor

```bash
npm run dev
```

---

## 🔒 Segurança

- ✅ Autenticação JWT em todas as rotas (exceto login)
- ✅ Hash de senhas com bcrypt
- ✅ Validação de permissões (ADMIN para ações sensíveis)
- ✅ Validação de propriedade (usuário só edita seus próprios recursos)
- ✅ HttpOnly cookies para tokens

---

## 📝 Notas Importantes

1. **Upload de Arquivos**: Requer configuração do bucket `documentos` no Supabase Storage
2. **Tokens**: Tokens são armazenados em cookies httpOnly e também podem ser enviados via header Authorization
3. **Soft Delete**: Departamentos usam soft delete (ativo=false)
4. **Histórico**: Todas as ações importantes são registradas no histórico de eventos
5. **Progresso**: Calculado automaticamente baseado na posição no fluxo

---

## 🔗 Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login |
| GET | `/api/processos` | Lista processos |
| POST | `/api/processos` | Cria processo |
| GET | `/api/processos/[id]` | Busca processo |
| PUT | `/api/processos/[id]` | Atualiza processo |
| POST | `/api/processos/[id]/avancar` | Avança processo |
| POST | `/api/documentos` | Upload documento |
| GET | `/api/analytics` | Estatísticas |

---

**Back-end completo e pronto para uso! 🎉**



