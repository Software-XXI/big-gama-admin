import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
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
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '24h' });
}

export function verifyToken(token: string): {
  sub: string;
  email: string;
  role: string;
} {
  return jwt.verify(token, JWT_SECRET!) as {
    sub: string;
    email: string;
    role: string;
  };
}
