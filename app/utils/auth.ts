import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

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
  
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as string;
  
  return jwt.sign(payload, secret, {
    expiresIn,
  } as jwt.SignOptions);
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
        departamentoId: true,
        permissoes: true,
        ativo: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

