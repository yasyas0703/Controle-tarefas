import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@example.com',
      senha: hashedPassword,
      role: 'ADMIN',
      permissoes: ['*'], // Todas permissões
      ativo: true,
    },
  });

  console.log('✅ Usuário admin criado:', admin.email);

  // Criar departamentos padrão
  const departamentos = await Promise.all([
    prisma.departamento.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Atendimento',
        descricao: 'Departamento de atendimento inicial',
        cor: 'from-blue-500 to-cyan-600',
        icone: 'Headphones',
        ordem: 1,
        ativo: true,
      },
    }),
    prisma.departamento.upsert({
      where: { id: 2 },
      update: {},
      create: {
        nome: 'Jurídico',
        descricao: 'Departamento jurídico',
        cor: 'from-purple-500 to-pink-600',
        icone: 'Scale',
        ordem: 2,
        ativo: true,
      },
    }),
    prisma.departamento.upsert({
      where: { id: 3 },
      update: {},
      create: {
        nome: 'Contábil',
        descricao: 'Departamento contábil',
        cor: 'from-green-500 to-emerald-600',
        icone: 'Calculator',
        ordem: 3,
        ativo: true,
      },
    }),
    prisma.departamento.upsert({
      where: { id: 4 },
      update: {},
      create: {
        nome: 'Finalização',
        descricao: 'Departamento de finalização',
        cor: 'from-orange-500 to-red-600',
        icone: 'CheckCircle',
        ordem: 4,
        ativo: true,
      },
    }),
  ]);

  console.log('✅ Departamentos criados:', departamentos.length);

  // Criar tags padrão
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { nome: 'Urgente' },
      update: {},
      create: {
        nome: 'Urgente',
        cor: 'bg-red-500',
        texto: 'text-white',
      },
    }),
    prisma.tag.upsert({
      where: { nome: 'Aguardando Cliente' },
      update: {},
      create: {
        nome: 'Aguardando Cliente',
        cor: 'bg-yellow-500',
        texto: 'text-white',
      },
    }),
    prisma.tag.upsert({
      where: { nome: 'Revisão' },
      update: {},
      create: {
        nome: 'Revisão',
        cor: 'bg-purple-500',
        texto: 'text-white',
      },
    }),
    prisma.tag.upsert({
      where: { nome: 'Documentação Pendente' },
      update: {},
      create: {
        nome: 'Documentação Pendente',
        cor: 'bg-orange-500',
        texto: 'text-white',
      },
    }),
  ]);

  console.log('✅ Tags criadas:', tags.length);

  // Criar usuário de exemplo
  const usuarioExemplo = await prisma.usuario.upsert({
    where: { email: 'usuario@example.com' },
    update: {},
    create: {
      nome: 'Usuário Exemplo',
      email: 'usuario@example.com',
      senha: await bcrypt.hash('senha123', 10),
      role: 'USUARIO',
      departamentoId: departamentos[0].id,
      ativo: true,
    },
  });

  console.log('✅ Usuário exemplo criado:', usuarioExemplo.email);

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



