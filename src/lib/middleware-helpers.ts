import { NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { connectDB } from './mongodb';
import { User } from './models/user';

export interface TokenUser {
  sub: string;
  email: string;
  role: string;
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function authenticateRequest(request: Request): Promise<
  | { user: TokenUser; error: null }
  | { user: null; error: NextResponse }
> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      ),
    };
  }

  try {
    const decoded = verifyToken(token);
    return { user: decoded, error: null };
  } catch {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      ),
    };
  }
}

export async function requireRole(request: Request, allowedRoles: string[]) {
  const result = await authenticateRequest(request);
  if (result.error) return result;

  if (!allowedRoles.includes(result.user!.role)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'No tienes permisos para acceder a este recurso' },
        { status: 403 }
      ),
    };
  }

  return result;
}

export async function getUserFromDB(userId: string) {
  await connectDB();
  return User.findById(userId).select('-password');
}
