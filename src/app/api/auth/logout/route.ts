import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const isSecure =
    request.nextUrl.protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https';

  const response = NextResponse.json({ message: 'Sesión cerrada' });
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
