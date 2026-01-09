# 🔗 Integração Front-End com Back-End

Este documento descreve todas as integrações realizadas entre o front-end e o back-end.

## ✅ O que foi implementado

### 1. **API Client (`app/utils/api.ts`)**
- ✅ Atualizado para usar rotas Next.js (`/api/...`)
- ✅ Suporte a cookies httpOnly (autenticação automática)
- ✅ Tratamento de erros melhorado
- ✅ Métodos assíncronos com validação de resposta
- ✅ Novos métodos adicionados:
  - `getProcesso(id)` - Buscar processo específico
  - `avancarProcesso(id)` - Avançar processo entre departamentos
  - `adicionarTagProcesso(processoId, tagId)` - Adicionar tag
  - `removerTagProcesso(processoId, tagId)` - Remover tag
  - `getQuestionarios(departamentoId, processoId?)` - Buscar questionários
  - `getAnalytics(periodo?)` - Buscar estatísticas

### 2. **Modal de Login (`app/components/modals/ModalLogin.tsx`)**
- ✅ Integrado com API real `/api/auth/login`
- ✅ Campo alterado de "Usuário" para "Email"
- ✅ Autenticação via API
- ✅ Armazenamento de token no localStorage (fallback)
- ✅ Tratamento de erros
- ✅ Estado de loading durante login
- ✅ Credenciais demo atualizadas: `admin@example.com` / `admin123`

### 3. **SistemaContext (`app/context/SistemaContext.tsx`)**
- ✅ Carregamento automático de dados quando usuário faz login:
  - Departamentos
  - Tags
  - Processos
  - Empresas
  - Templates
  - Usuários (se admin)
  - Notificações

- ✅ Todas as funções atualizadas para usar APIs reais:
  - `criarEmpresa()` → `api.salvarEmpresa()`
  - `atualizarEmpresa()` → `api.atualizarEmpresa()`
  - `excluirEmpresa()` → `api.excluirEmpresa()`
  - `criarTemplate()` → `api.salvarTemplate()`
  - `excluirTemplate()` → `api.excluirTemplate()`
  - `criarProcesso()` → `api.salvarProcesso()`
  - `atualizarProcesso()` → `api.atualizarProcesso()`
  - `excluirProcesso()` → `api.excluirProcesso()`
  - `avancarParaProximoDepartamento()` → `api.avancarProcesso()`
  - `finalizarProcesso()` → `api.atualizarProcesso()` com status FINALIZADO
  - `aplicarTagsProcesso()` → `api.adicionarTagProcesso()`
  - `adicionarComentarioProcesso()` → `api.salvarComentario()`
  - `adicionarDocumentoProcesso()` → `api.uploadDocumento()`

- ✅ Notificações automáticas em todas as operações
- ✅ Tratamento de erros em todas as funções
- ✅ Recarga automática de dados após operações

## 🔄 Fluxo de Dados

### Login
1. Usuário preenche email e senha no `ModalLogin`
2. Chama `api.login(email, senha)`
3. Backend valida e retorna token + dados do usuário
4. Token salvo no localStorage e cookie httpOnly
5. `SistemaContext` carrega todos os dados do sistema

### Operações CRUD
1. Usuário realiza ação (criar, editar, excluir)
2. `SistemaContext` chama API correspondente
3. Backend processa e retorna dados atualizados
4. Frontend atualiza estado local
5. Notificação é exibida (sucesso ou erro)

## 🔐 Autenticação

- **Token JWT**: Armazenado em cookie httpOnly (seguro) e localStorage (fallback)
- **Middleware**: Todas as rotas `/api/*` requerem autenticação (exceto `/api/auth/login`)
- **Headers**: Token enviado via `Authorization: Bearer <token>` ou cookie

## 📋 Próximos Passos

### O que ainda pode ser melhorado:

1. **Atualização de Componentes**
   - Alguns componentes podem precisar de ajustes para funcionar com os novos dados do backend
   - Verificar tipos/interfaces dos dados retornados pela API

2. **Tratamento de Erros**
   - Adicionar retry automático em caso de falha de rede
   - Melhorar mensagens de erro para o usuário

3. **Otimizações**
   - Cache de dados frequentemente acessados
   - Paginação em listas grandes
   - Loading states em componentes

4. **Testes**
   - Testar todas as funcionalidades end-to-end
   - Verificar integração completa

## 🚀 Como Testar

1. **Iniciar o servidor:**
```bash
npm run dev
```

2. **Fazer login:**
   - Email: `admin@example.com`
   - Senha: `admin123`

3. **Testar funcionalidades:**
   - Criar processo
   - Criar empresa
   - Adicionar comentários
   - Fazer upload de documentos
   - Avançar processo entre departamentos
   - Criar templates

## ⚠️ Importante

- Certifique-se de que o banco de dados está configurado e as tabelas foram criadas
- Execute o seed para ter dados iniciais: `npm run prisma:seed`
- Configure as variáveis de ambiente no arquivo `.env`
- Certifique-se de que o Supabase Storage está configurado para uploads

## 📝 Notas

- Todas as funções são agora assíncronas (retornam `Promise`)
- Os componentes que usam essas funções precisam usar `await` ou `.then()`
- O estado local é atualizado automaticamente após operações bem-sucedidas
- Erros são tratados e notificações são exibidas automaticamente

---

**Integração concluída com sucesso! 🎉**



