# 📋 PLANO COMPLETO DE DESENVOLVIMENTO - Sistema de Abertura de Empresas

**Versão:** 1.0.0  
**Data:** 2024  
**Banco de Dados:** Supabase (PostgreSQL)  
**ORM:** Prisma  
**Framework:** Next.js 14

---

## 🎯 VISÃO GERAL DO SISTEMA

Sistema completo de gerenciamento de processos para abertura de empresas, com fluxo de departamentos, questionários dinâmicos, upload de documentos, comentários, tags, templates e analytics.

---

## 📊 ESTRUTURA DO BANCO DE DADOS (Prisma Schema)

### 📁 Arquivo: `prisma/schema.prisma`

```prisma
// Configuração do Prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// TABELAS PRINCIPAIS
// ============================================

// Usuários do Sistema
model Usuario {
  id            Int       @id @default(autoincrement())
  nome          String
  email         String    @unique
  senha         String    // Hash bcrypt
  role          Role      @default(USUARIO)
  departamentoId Int?
  departamento  Departamento? @relation(fields: [departamentoId], references: [id])
  ativo         Boolean   @default(true)
  permissoes    String[]  @default([]) // Array de strings com permissões
  criadoEm      DateTime  @default(now())
  atualizadoEm  DateTime  @updatedAt
  
  processosCriados  Processo[] @relation("ProcessoCriadoPor")
  comentarios       Comentario[]
  historicoEventos  HistoricoEvento[]
  respostasQuestionario RespostaQuestionario[]
  templatesCriados  Template[]
  notificacoes      Notificacao[]
  
  @@index([email])
  @@index([role])
}

enum Role {
  ADMIN
  GERENTE
  USUARIO
}

// Departamentos do Fluxo
model Departamento {
  id                      Int       @id @default(autoincrement())
  nome                    String
  descricao               String?
  responsavel             String?
  cor                     String    @default("from-cyan-500 to-blue-600") // Gradiente Tailwind
  icone                   String?   // Nome do ícone Lucide
  ativo                   Boolean   @default(true)
  ordem                   Int       @default(0)
  criadoEm                DateTime  @default(now())
  atualizadoEm            DateTime  @updatedAt
  
  usuarios                Usuario[]
  processos               Processo[]
  questionarios           QuestionarioDepartamento[]
  documentosObrigatorios  DocumentoObrigatorio[]
  historicoFluxos         HistoricoFluxo[]
  comentarios             Comentario[]
  documentos              Documento[]
  
  @@index([ativo, ordem])
}

// Empresas Cadastradas
model Empresa {
  id                    Int       @id @default(autoincrement())
  cnpj                  String?   @unique
  codigo                String    @unique
  razao_social          String
  apelido               String?   // Nome fantasia
  inscricao_estadual    String?
  inscricao_municipal   String?
  regime_federal        String?
  regime_estadual       String?
  regime_municipal      String?
  data_abertura         DateTime?
  estado                String?
  cidade                String?
  bairro                String?
  logradouro            String?
  numero                String?
  cep                   String?
  email                 String?
  telefone              String?
  cadastrada            Boolean   @default(false) // true se CNPJ informado
  criado_em             DateTime  @default(now())
  atualizado_em         DateTime  @updatedAt
  
  processos             Processo[]
  
  @@index([cnpj])
  @@index([codigo])
  @@index([cadastrada])
}

// Processos/Solicitações
model Processo {
  id                      Int       @id @default(autoincrement())
  nome                    String?
  nomeServico             String?
  nomeEmpresa             String
  cliente                 String?
  email                   String?
  telefone                String?
  
  empresaId               Int?
  empresa                 Empresa?  @relation(fields: [empresaId], references: [id])
  
  status                  Status    @default(EM_ANDAMENTO)
  prioridade              Prioridade @default(MEDIA)
  
  departamentoAtual       Int
  departamentoAtualIndex  Int       @default(0)
  fluxoDepartamentos      Int[]     @default([]) // Array de IDs de departamentos
  
  descricao               String?   @db.Text
  notasCriador            String?   @db.Text
  
  criadoPorId             Int?
  criadoPor               Usuario?  @relation("ProcessoCriadoPor", fields: [criadoPorId], references: [id])
  
  criadoEm                DateTime  @default(now())
  dataCriacao             DateTime  @default(now())
  dataAtualizacao         DateTime  @default(now())
  dataInicio              DateTime?
  dataEntrega             DateTime?
  dataFinalizacao         DateTime?
  
  progresso               Int       @default(0) // 0-100
  
  // Relações
  tags                    ProcessoTag[]
  comentarios             Comentario[]
  documentos              Documento[]
  historicoEventos        HistoricoEvento[]
  historicoFluxos         HistoricoFluxo[]
  questionarios           QuestionarioDepartamento[]
  respostasQuestionario   RespostaQuestionario[]
  
  @@index([status])
  @@index([departamentoAtual])
  @@index([empresaId])
  @@index([criadoPorId])
  @@index([dataCriacao])
}

enum Status {
  EM_ANDAMENTO
  FINALIZADO
  PAUSADO
  CANCELADO
  RASCUNHO
}

enum Prioridade {
  ALTA
  MEDIA
  BAIXA
}

// Tags do Sistema
model Tag {
  id          Int       @id @default(autoincrement())
  nome        String    @unique
  cor         String    @default("bg-blue-500") // Cor Tailwind
  texto       String    @default("text-white") // Cor do texto
  criadoEm    DateTime  @default(now())
  atualizadoEm DateTime @updatedAt
  
  processos   ProcessoTag[]
  
  @@index([nome])
}

// Relação Muitos-para-Muitos: Processo <-> Tag
model ProcessoTag {
  id        Int      @id @default(autoincrement())
  processoId Int
  tagId     Int
  processo  Processo @relation(fields: [processoId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@unique([processoId, tagId])
  @@index([processoId])
  @@index([tagId])
}

// Comentários nos Processos
model Comentario {
  id              Int       @id @default(autoincrement())
  processoId      Int
  processo        Processo  @relation(fields: [processoId], references: [id], onDelete: Cascade)
  
  texto           String    @db.Text
  autorId         Int
  autor           Usuario   @relation(fields: [autorId], references: [id])
  
  departamentoId  Int?
  departamento    Departamento? @relation(fields: [departamentoId], references: [id])
  
  mencoes         String[]  @default([]) // Array de emails/nomes mencionados
  editado         Boolean   @default(false)
  editadoEm       DateTime?
  criadoEm        DateTime  @default(now())
  atualizadoEm    DateTime  @updatedAt
  
  @@index([processoId])
  @@index([autorId])
}

// Documentos dos Processos
model Documento {
  id              Int       @id @default(autoincrement())
  processoId      Int
  processo        Processo  @relation(fields: [processoId], references: [id], onDelete: Cascade)
  
  nome            String
  tipo            String    // Geral, Contrato Social, CNPJ, etc.
  tipoCategoria   String?   // Categoria adicional
  tamanho         BigInt    // Tamanho em bytes
  url             String    // URL no Supabase Storage
  path            String?   // Caminho no storage
  
  departamentoId  Int?
  departamento    Departamento? @relation(fields: [departamentoId], references: [id])
  
  perguntaId      Int?      // Se foi anexado em uma pergunta específica
  
  dataUpload      DateTime  @default(now())
  uploadPorId     Int?
  
  @@index([processoId])
  @@index([departamentoId])
  @@index([tipo])
}

// Documentos Obrigatórios por Departamento
model DocumentoObrigatorio {
  id              Int       @id @default(autoincrement())
  departamentoId  Int
  departamento    Departamento @relation(fields: [departamentoId], references: [id], onDelete: Cascade)
  
  tipo            String
  nome            String
  descricao       String?   @db.Text
  obrigatorio     Boolean   @default(true)
  
  @@index([departamentoId])
}

// Questionários por Departamento
model QuestionarioDepartamento {
  id              Int       @id @default(autoincrement())
  departamentoId  Int
  departamento    Departamento @relation(fields: [departamentoId], references: [id], onDelete: Cascade)
  
  processoId      Int?
  processo        Processo? @relation(fields: [processoId], references: [id], onDelete: Cascade)
  
  label           String
  tipo            TipoCampo
  obrigatorio     Boolean   @default(false)
  ordem           Int       @default(0)
  
  opcoes          String[]  @default([]) // Para campos select
  placeholder     String?
  descricao       String?   @db.Text
  
  // Pergunta condicional
  condicaoPerguntaId Int?
  condicaoOperador   String? // igual, diferente, contem
  condicaoValor      String?
  
  respostas       RespostaQuestionario[]
  
  @@index([departamentoId])
  @@index([processoId])
}

enum TipoCampo {
  TEXT
  TEXTAREA
  NUMBER
  DATE
  BOOLEAN
  SELECT
  FILE
  PHONE
  EMAIL
}

// Respostas dos Questionários
model RespostaQuestionario {
  id              Int       @id @default(autoincrement())
  processoId      Int
  processo        Processo  @relation(fields: [processoId], references: [id], onDelete: Cascade)
  
  questionarioId  Int
  questionario    QuestionarioDepartamento @relation(fields: [questionarioId], references: [id], onDelete: Cascade)
  
  resposta        String    @db.Text // JSON string para valores complexos
  respondidoPorId Int
  respondidoPor   Usuario   @relation(fields: [respondidoPorId], references: [id])
  
  respondidoEm    DateTime  @default(now())
  atualizadoEm    DateTime  @updatedAt
  
  @@unique([processoId, questionarioId])
  @@index([processoId])
  @@index([questionarioId])
}

// Histórico de Eventos do Processo
model HistoricoEvento {
  id              Int       @id @default(autoincrement())
  processoId      Int
  processo        Processo  @relation(fields: [processoId], references: [id], onDelete: Cascade)
  
  tipo            TipoEvento
  acao            String    @db.Text
  responsavelId   Int?
  responsavel     Usuario?  @relation(fields: [responsavelId], references: [id])
  
  departamento    String?   // Nome do departamento no momento do evento
  data            DateTime  @default(now())
  dataTimestamp   BigInt    // Timestamp para ordenação
  
  @@index([processoId])
  @@index([data])
  @@index([tipo])
}

enum TipoEvento {
  INICIO
  ALTERACAO
  MOVIMENTACAO
  CONCLUSAO
  FINALIZACAO
  DOCUMENTO
  COMENTARIO
}

// Histórico de Fluxo (movimentação entre departamentos)
model HistoricoFluxo {
  id              Int       @id @default(autoincrement())
  processoId      Int
  processo        Processo  @relation(fields: [processoId], references: [id], onDelete: Cascade)
  
  departamentoId  Int
  departamento    Departamento @relation(fields: [departamentoId], references: [id])
  
  ordem           Int       // Ordem no fluxo (0, 1, 2, ...)
  status          String    // em_andamento, concluido, etc.
  entradaEm       DateTime  @default(now())
  saidaEm         DateTime?
  
  @@index([processoId])
  @@index([departamentoId])
}

// Templates de Processo
model Template {
  id                            Int       @id @default(autoincrement())
  nome                          String
  descricao                     String?   @db.Text
  fluxoDepartamentos            Int[]     @default([]) // Array de IDs
  questionariosPorDepartamento  Json      // JSON com questionários por dept
  criadoPorId                   Int?
  criadoPor                     Usuario?  @relation(fields: [criadoPorId], references: [id])
  criado_em                     DateTime  @default(now())
  atualizado_em                 DateTime  @updatedAt
  
  @@index([criadoPorId])
}

// Notificações do Sistema
model Notificacao {
  id          Int       @id @default(autoincrement())
  usuarioId   Int
  usuario     Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  
  mensagem    String    @db.Text
  tipo        TipoNotificacao @default(INFO)
  lida        Boolean   @default(false)
  
  processoId  Int?      // Se relacionado a um processo
  link        String?   // Link para ação
  
  criadoEm    DateTime  @default(now())
  
  @@index([usuarioId])
  @@index([lida])
  @@index([criadoEm])
}

enum TipoNotificacao {
  SUCESSO
  ERRO
  INFO
  AVISO
}
```

---

## 🚀 ETAPA 1: CONFIGURAÇÃO INICIAL DO PROJETO

### 1.1 Instalação de Dependências

```bash
# Instalar Prisma e client do Supabase
npm install @prisma/client @supabase/supabase-js
npm install -D prisma

# Instalar dependências de autenticação e segurança
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken

# Instalar dependências de validação
npm install zod

# Instalar dependências de upload
npm install multer @types/multer

# Instalar dependências de API routes (Next.js)
# Já incluído no Next.js, mas verificar se precisa de extras
```

### 1.2 Configuração do Prisma

```bash
# Inicializar Prisma
npx prisma init

# Criar arquivo schema.prisma na pasta prisma/
# (código completo acima)

# Gerar o Prisma Client
npx prisma generate

# Criar migration inicial
npx prisma migrate dev --name init
```

### 1.3 Configuração do Supabase

1. Criar projeto no Supabase (https://supabase.com)
2. Obter URL e Service Key do projeto
3. Configurar variáveis de ambiente

### 1.4 Arquivo `.env`

```env
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Supabase Storage (para uploads)
SUPABASE_STORAGE_BUCKET=documentos

# JWT Secret (para autenticação)
JWT_SECRET=[GERAR_UMA_CHAVE_SECRETA_FORTE]
JWT_EXPIRES_IN=7d

# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development

# Email (opcional, para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[EMAIL]
SMTP_PASS=[PASSWORD]
```

### 1.5 Arquivo `.env.example`

Criar arquivo de exemplo sem valores sensíveis:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=documentos
JWT_SECRET=
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NODE_ENV=development
```

---

## 🗄️ ETAPA 2: CONFIGURAÇÃO DO BANCO DE DADOS

### 2.1 Criar Schema Prisma

- Criar arquivo `prisma/schema.prisma` com o schema completo acima
- Configurar conexão com Supabase

### 2.2 Executar Migrations

```bash
# Criar migration inicial
npx prisma migrate dev --name init

# Ver status das migrations
npx prisma migrate status

# Resetar banco (CUIDADO: apaga todos os dados)
npx prisma migrate reset
```

### 2.3 Configurar Supabase Storage

1. Criar bucket `documentos` no Supabase Storage
2. Configurar políticas de acesso:
   - Inserir: Autenticados
   - Selecionar: Autenticados
   - Atualizar: Proprietário do arquivo
   - Deletar: Proprietário do arquivo ou Admin

### 2.4 Seed do Banco (Opcional)

Criar `prisma/seed.ts` para dados iniciais:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Criar usuário admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: 'admin@example.com',
      senha: hashedPassword,
      role: 'ADMIN',
      permissoes: ['*'], // Todas permissões
      ativo: true,
    },
  });

  // Criar tags padrão
  const tags = await Promise.all([
    prisma.tag.create({ data: { nome: 'Urgente', cor: 'bg-red-500', texto: 'text-white' } }),
    prisma.tag.create({ data: { nome: 'Aguardando Cliente', cor: 'bg-yellow-500', texto: 'text-white' } }),
    prisma.tag.create({ data: { nome: 'Revisão', cor: 'bg-purple-500', texto: 'text-white' } }),
    prisma.tag.create({ data: { nome: 'Documentação Pendente', cor: 'bg-orange-500', texto: 'text-white' } }),
  ]);

  console.log('Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Atualizar `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

---

## 🔐 ETAPA 3: SISTEMA DE AUTENTICAÇÃO

### 3.1 Criar Utilitários de Autenticação

**Arquivo:** `app/utils/auth.ts`

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');
  
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado');
  
  return jwt.verify(token, secret) as TokenPayload;
}

export async function getUserFromToken(token: string) {
  try {
    const payload = verifyToken(token);
    const user = await prisma.usuario.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        permissoes: true,
        ativo: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}
```

### 3.2 Criar Middleware de Autenticação

**Arquivo:** `app/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserFromToken } from '@/app/utils/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  
  // Rotas públicas
  if (request.nextUrl.pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }
  
  // Rotas de API requerem autenticação
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    
    const user = await getUserFromToken(token);
    if (!user || !user.ativo) {
      return NextResponse.json(
        { error: 'Usuário inválido ou inativo' },
        { status: 401 }
      );
    }
    
    // Adicionar usuário ao request
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(user.id));
    requestHeaders.set('x-user-role', user.role);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
```

### 3.3 Criar API Route de Login

**Arquivo:** `app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, generateToken } from '@/app/utils/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();
    
    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }
    
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });
    
    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }
    
    const senhaValida = await verifyPassword(senha, usuario.senha);
    
    if (!senhaValida) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }
    
    const token = generateToken({
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
    });
    
    const response = NextResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        permissoes: usuario.permissoes,
      },
      token,
    });
    
    // Definir cookie com token
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });
    
    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
```

---

## 📡 ETAPA 4: API ROUTES - CRUD BÁSICO

### 4.1 Processos

**Arquivo:** `app/api/processos/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/processos
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const departamentoId = searchParams.get('departamentoId');
    
    const processos = await prisma.processo.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(departamentoId && { departamentoAtual: parseInt(departamentoId) }),
      },
      include: {
        empresa: true,
        tags: {
          include: { tag: true },
        },
        comentarios: {
          include: { autor: { select: { id: true, nome: true, email: true } } },
          orderBy: { criadoEm: 'desc' },
        },
        documentos: true,
        historicoEventos: {
          orderBy: { data: 'desc' },
          take: 10,
        },
      },
      orderBy: { dataCriacao: 'desc' },
    });
    
    return NextResponse.json(processos);
  } catch (error) {
    console.error('Erro ao buscar processos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar processos' },
      { status: 500 }
    );
  }
}

// POST /api/processos
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const data = await request.json();
    
    const processo = await prisma.processo.create({
      data: {
        nome: data.nome,
        nomeServico: data.nomeServico,
        nomeEmpresa: data.nomeEmpresa,
        cliente: data.cliente,
        email: data.email,
        telefone: data.telefone,
        empresaId: data.empresaId,
        status: data.status || 'EM_ANDAMENTO',
        prioridade: data.prioridade || 'MEDIA',
        departamentoAtual: data.departamentoAtual,
        departamentoAtualIndex: data.departamentoAtualIndex || 0,
        fluxoDepartamentos: data.fluxoDepartamentos || [],
        descricao: data.descricao,
        notasCriador: data.notasCriador,
        criadoPorId: parseInt(userId),
        progresso: data.progresso || 0,
      },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
      },
    });
    
    // Criar histórico inicial
    await prisma.historicoEvento.create({
      data: {
        processoId: processo.id,
        tipo: 'INICIO',
        acao: `Solicitação criada: ${processo.nomeServico || 'Solicitação'}`,
        responsavelId: parseInt(userId),
        departamento: 'Sistema',
        dataTimestamp: Date.now(),
      },
    });
    
    return NextResponse.json(processo, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao criar processo' },
      { status: 500 }
    );
  }
}
```

**Arquivo:** `app/api/processos/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/processos/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const processo = await prisma.processo.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
        comentarios: {
          include: { autor: { select: { id: true, nome: true, email: true } } },
          orderBy: { criadoEm: 'desc' },
        },
        documentos: {
          orderBy: { dataUpload: 'desc' },
        },
        historicoEventos: {
          include: { responsavel: { select: { id: true, nome: true } } },
          orderBy: { data: 'desc' },
        },
        questionarios: {
          include: {
            respostas: {
              include: { respondidoPor: { select: { id: true, nome: true } } },
            },
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
    
    return NextResponse.json(processo);
  } catch (error) {
    console.error('Erro ao buscar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar processo' },
      { status: 500 }
    );
  }
}

// PUT /api/processos/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const data = await request.json();
    
    const processo = await prisma.processo.update({
      where: { id: parseInt(params.id) },
      data: {
        ...data,
        dataAtualizacao: new Date(),
      },
      include: {
        empresa: true,
        tags: { include: { tag: true } },
      },
    });
    
    return NextResponse.json(processo);
  } catch (error) {
    console.error('Erro ao atualizar processo:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar processo' },
      { status: 500 }
    );
  }
}

// DELETE /api/processos/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.processo.delete({
      where: { id: parseInt(params.id) },
    });
    
    return NextResponse.json({ message: 'Processo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir processo:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir processo' },
      { status: 500 }
    );
  }
}
```

### 4.2 Departamentos

**Arquivo:** `app/api/departamentos/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const departamentos = await prisma.departamento.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
      include: {
        _count: {
          select: { processos: true },
        },
      },
    });
    
    return NextResponse.json(departamentos);
  } catch (error) {
    console.error('Erro ao buscar departamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar departamentos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const departamento = await prisma.departamento.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        responsavel: data.responsavel,
        cor: data.cor || 'from-cyan-500 to-blue-600',
        icone: data.icone,
        ordem: data.ordem || 0,
        ativo: data.ativo !== undefined ? data.ativo : true,
      },
    });
    
    return NextResponse.json(departamento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar departamento:', error);
    return NextResponse.json(
      { error: 'Erro ao criar departamento' },
      { status: 500 }
    );
  }
}
```

### 4.3 Empresas

**Arquivo:** `app/api/empresas/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cadastrada = searchParams.get('cadastrada');
    const busca = searchParams.get('busca');
    
    const empresas = await prisma.empresa.findMany({
      where: {
        ...(cadastrada !== null && { cadastrada: cadastrada === 'true' }),
        ...(busca && {
          OR: [
            { codigo: { contains: busca, mode: 'insensitive' } },
            { razao_social: { contains: busca, mode: 'insensitive' } },
            { cnpj: { contains: busca } },
          ],
        }),
      },
      orderBy: { criado_em: 'desc' },
      include: {
        _count: {
          select: { processos: true },
        },
      },
    });
    
    return NextResponse.json(empresas);
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar empresas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const empresa = await prisma.empresa.create({
      data: {
        cnpj: data.cnpj,
        codigo: data.codigo,
        razao_social: data.razao_social,
        apelido: data.apelido,
        inscricao_estadual: data.inscricao_estadual,
        inscricao_municipal: data.inscricao_municipal,
        regime_federal: data.regime_federal,
        regime_estadual: data.regime_estadual,
        regime_municipal: data.regime_municipal,
        data_abertura: data.data_abertura ? new Date(data.data_abertura) : null,
        estado: data.estado,
        cidade: data.cidade,
        bairro: data.bairro,
        logradouro: data.logradouro,
        numero: data.numero,
        cep: data.cep,
        email: data.email,
        telefone: data.telefone,
        cadastrada: !!data.cnpj && data.cnpj.replace(/\D/g, '').length >= 14,
      },
    });
    
    return NextResponse.json(empresa, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    return NextResponse.json(
      { error: 'Erro ao criar empresa' },
      { status: 500 }
    );
  }
}
```

### 4.4 Tags, Comentários, Documentos

Criar rotas similares para:
- `/app/api/tags/route.ts`
- `/app/api/comentarios/route.ts`
- `/app/api/documentos/route.ts`
- `/app/api/questionarios/route.ts`
- `/app/api/templates/route.ts`
- `/app/api/usuarios/route.ts`
- `/app/api/notificacoes/route.ts`

---

## 📤 ETAPA 5: UPLOAD DE DOCUMENTOS COM SUPABASE STORAGE

### 5.1 Configurar Cliente Supabase

**Arquivo:** `app/utils/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadFile(
  file: File,
  path: string
): Promise<{ url: string; path: string }> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'documentos';
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${path}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return {
    url: publicUrl,
    path: filePath,
  };
}

export async function deleteFile(path: string): Promise<void> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'documentos';
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) throw error;
}
```

### 5.2 API Route de Upload

**Arquivo:** `app/api/documentos/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { uploadFile } from '@/app/utils/supabase';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get('arquivo') as File;
    const processoId = parseInt(formData.get('processoId') as string);
    const tipo = formData.get('tipo') as string;
    const departamentoId = formData.get('departamentoId')
      ? parseInt(formData.get('departamentoId') as string)
      : null;
    const perguntaId = formData.get('perguntaId')
      ? parseInt(formData.get('perguntaId') as string)
      : null;
    
    if (!file || !processoId || !tipo) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Upload para Supabase Storage
    const { url, path } = await uploadFile(file, `processos/${processoId}`);
    
    // Salvar no banco
    const documento = await prisma.documento.create({
      data: {
        processoId,
        nome: file.name,
        tipo,
        tipoCategoria: formData.get('tipoCategoria') as string | null,
        tamanho: BigInt(file.size),
        url,
        path,
        departamentoId,
        perguntaId,
        uploadPorId: parseInt(userId),
      },
    });
    
    // Criar evento no histórico
    await prisma.historicoEvento.create({
      data: {
        processoId,
        tipo: 'DOCUMENTO',
        acao: `Documento "${file.name}" adicionado`,
        responsavelId: parseInt(userId),
        dataTimestamp: Date.now(),
      },
    });
    
    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload' },
      { status: 500 }
    );
  }
}
```

---

## 🔄 ETAPA 6: INTEGRAÇÃO DO FRONTEND COM API

### 6.1 Atualizar `app/utils/api.ts`

Substituir todas as funções mockadas por chamadas reais à API usando `fetch` para as rotas criadas.

### 6.2 Atualizar `app/context/SistemaContext.tsx`

Modificar todas as funções para fazer chamadas à API ao invés de manipular estado local:

```typescript
// Exemplo: carregarProcessos
useEffect(() => {
  async function carregar() {
    try {
      const processos = await api.getProcessos();
      setProcessos(processos);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
    }
  }
  if (usuarioLogado) {
    carregar();
  }
}, [usuarioLogado]);
```

### 6.3 Atualizar Modal de Login

Modificar `app/components/modals/ModalLogin.tsx` para usar a API real:

```typescript
const handleLogin = async (email: string, senha: string) => {
  try {
    const response = await api.login(email, senha);
    setUsuarioLogado(response.usuario);
    // Token já está no cookie
  } catch (error) {
    mostrarAlerta('Erro', 'Credenciais inválidas', 'erro');
  }
};
```

---

## 📊 ETAPA 7: FUNCIONALIDADES AVANÇADAS

### 7.1 Questionários Dinâmicos

**API:** `/app/api/questionarios/[processoId]/[departamentoId]/route.ts`

```typescript
// GET - Buscar questionário
// POST - Salvar respostas
```

### 7.2 Avançar Processo entre Departamentos

**API:** `/app/api/processos/[id]/avancar/route.ts`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Lógica para avançar para próximo departamento
  // Criar histórico de fluxo
  // Atualizar progresso
}
```

### 7.3 Analytics e Relatórios

**API:** `/app/api/analytics/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // Agregações:
  // - Total de processos
  // - Taxa de sucesso
  // - Tempo médio por departamento
  // - Gargalos
  // - Previsões
}
```

### 7.4 Sistema de Notificações

Criar notificações automáticas para:
- Novo processo atribuído
- Processo avançado para seu departamento
- Comentário em processo que você está envolvido
- Documento necessário faltando

---

## 🧪 ETAPA 8: TESTES E VALIDAÇÕES

### 8.1 Validações no Frontend

Usar Zod para validação de formulários:

```typescript
import { z } from 'zod';

const empresaSchema = z.object({
  cnpj: z.string().optional(),
  codigo: z.string().min(1, 'Código obrigatório'),
  razao_social: z.string().min(1, 'Razão social obrigatória'),
  // ...
});
```

### 8.2 Validações no Backend

Criar middleware de validação para as rotas da API.

### 8.3 Testes

- Testes unitários dos utilitários
- Testes de integração das rotas da API
- Testes E2E dos fluxos principais

---

## 🚀 ETAPA 9: DEPLOY E PRODUÇÃO

### 9.1 Variáveis de Ambiente de Produção

Configurar no Vercel/Supabase:
- `DATABASE_URL` (produção)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

### 9.2 Build e Deploy

```bash
# Build
npm run build

# Deploy no Vercel
vercel --prod
```

### 9.3 Migrations em Produção

```bash
# Rodar migrations no Supabase
npx prisma migrate deploy
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Infraestrutura (Semana 1)
- [ ] Configurar Supabase
- [ ] Instalar e configurar Prisma
- [ ] Criar schema completo
- [ ] Executar migrations
- [ ] Configurar Supabase Storage
- [ ] Configurar variáveis de ambiente

### Fase 2: Autenticação (Semana 1-2)
- [ ] Implementar hash de senhas
- [ ] Criar sistema de JWT
- [ ] API de login
- [ ] Middleware de autenticação
- [ ] Atualizar frontend para usar login real

### Fase 3: CRUD Básico (Semana 2-3)
- [ ] API de Processos (CRUD)
- [ ] API de Departamentos (CRUD)
- [ ] API de Empresas (CRUD)
- [ ] API de Tags (CRUD)
- [ ] API de Usuários (CRUD)
- [ ] Integrar frontend com APIs

### Fase 4: Funcionalidades Principais (Semana 3-4)
- [ ] Upload de documentos (Supabase Storage)
- [ ] Sistema de comentários
- [ ] Questionários dinâmicos
- [ ] Avançar processo entre departamentos
- [ ] Histórico de eventos
- [ ] Templates de processo

### Fase 5: Funcionalidades Avançadas (Semana 4-5)
- [ ] Sistema de notificações
- [ ] Analytics e relatórios
- [ ] Filtros avançados
- [ ] Busca full-text
- [ ] Exportação de dados

### Fase 6: Polimento (Semana 5-6)
- [ ] Validações completas
- [ ] Tratamento de erros
- [ ] Loading states
- [ ] Otimizações de performance
- [ ] Testes

### Fase 7: Deploy (Semana 6)
- [ ] Configurar produção
- [ ] Migrations em produção
- [ ] Deploy no Vercel
- [ ] Monitoramento
- [ ] Documentação final

---

## 📝 NOTAS IMPORTANTES

### Segurança
- Sempre validar dados no backend
- Usar HTTPS em produção
- Proteger rotas sensíveis com middleware
- Validar permissões do usuário
- Sanitizar inputs para prevenir SQL injection (Prisma já faz isso)
- Limitar tamanho de uploads

### Performance
- Usar índices no banco de dados (já incluídos no schema)
- Implementar paginação nas listagens
- Usar cache quando apropriado
- Otimizar queries com `select` específico
- Lazy loading de componentes pesados

### Escalabilidade
- Considerar usar Redis para cache
- Implementar fila para processamento assíncrono
- Monitorar performance do banco
- Considerar CDN para assets estáticos

---

## 🔗 RECURSOS ÚTEIS

- [Documentação Prisma](https://www.prisma.io/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**Este plano é um guia completo para implementar todo o sistema com banco de dados real usando Supabase e Prisma ORM.**



