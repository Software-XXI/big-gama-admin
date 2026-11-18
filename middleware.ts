import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_ROUTES = ['/login'];
const ADMIN_ROUTES = ['/dashboard', '/trips', '/users', '/alerts', '/analytics'];
const DRIVER_ROUTES = ['/driver/dashboard', '/driver/trips'];
const TOKEN_COOKIE = 'token';

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function loginRedirect(request: NextRequest, pathname: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (!token) {
    return loginRedirect(request, pathname);
  }

  const secret = getSecret();
  if (!secret) {
    console.error('middleware: JWT_SECRET no está configurado');
    return loginRedirect(request, pathname);
  }

  let role: string;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'big-gama-admin',
      audience: 'big-gama-admin-web',
    });
    role = typeof payload.role === 'string' ? payload.role : '';
  } catch {
    return loginRedirect(request, pathname);
  }

  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/driver/dashboard', request.url));
  }

  if (DRIVER_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'CONDUCTOR') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
