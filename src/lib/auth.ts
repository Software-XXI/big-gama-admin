import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const JWT_ISSUER = 'big-gama-admin';
export const JWT_AUDIENCE = 'big-gama-admin-web';
export const TOKEN_TTL_SECONDS = 60 * 60 * 24;
const SALT_ROUNDS = 12;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: {
  sub: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyToken(token: string): {
  sub: string;
  email: string;
  role: string;
} {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as jwt.JwtPayload & { sub?: string; email?: string; role?: string };

  if (!decoded.sub || !decoded.email || !decoded.role) {
    throw new Error('Token payload inválido');
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}
