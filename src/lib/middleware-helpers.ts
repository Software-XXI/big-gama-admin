import { NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { connectDB } from './mongodb';
import { User } from './models/user';

export interface TokenUser {
  sub: string;
  email: string;
  role: string;
}

const TOKEN_COOKIE = 'token';

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

export function getTokenFromRequest(request: Request): string | null {
  const cookieToken = parseCookies(request.headers.get('cookie'))[TOKEN_COOKIE];
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && bearer !== 'null' && bearer !== 'undefined') {
      return bearer;
    }
  }

  return null;
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

    await connectDB();
    const user = await User.findById(decoded.sub)
      .select('email role isActive')
      .lean();

    if (!user || !user.isActive) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Cuenta inactiva o inexistente' },
          { status: 401 }
        ),
      };
    }

    return {
      user: {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      error: null,
    };
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
