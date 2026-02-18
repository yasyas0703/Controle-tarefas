import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'yasmin@triarcontabilidade.com.br' },
    update: {},
    create: {
      nome: 'Yasmin',
      email: 'yasmin@triarcontabilidade.com.br',
      senha: hashedPassword,
      role: 'ADMIN',
      permissoes: ['*'], // Todas permissões
      ativo: true,
    },
  });

  console.log('✅ Usuário admin criado:', admin.email);



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




