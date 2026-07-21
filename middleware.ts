import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login'];
const ADMIN_ROUTES = ['/dashboard', '/trips', '/users', '/alerts', '/analytics'];
const DRIVER_ROUTES = ['/driver/dashboard', '/driver/trips'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );

    const role = payload.role as string;

    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'ADMIN') {
      if (pathname.startsWith('/driver')) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/driver/dashboard', request.url));
    }

    if (DRIVER_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'CONDUCTOR') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
