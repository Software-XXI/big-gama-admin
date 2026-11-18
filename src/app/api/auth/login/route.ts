import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { comparePassword, signToken, TOKEN_TTL_SECONDS } from '@/lib/auth';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rate-limit';
import { formatZodError, loginSchema } from '@/lib/validation';

const DUMMY_HASH = '$2b$12$0/ddIAg22Ne6q6VmTzsYZ.7DGB8.h.7u5oKpwjweVp07z56ZWRX2q';
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const ip = getClientIp(request);
    const rateKey = `login:${ip}:${email}`;

    const rate = checkRateLimit(rateKey, RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSeconds) },
        }
      );
    }

    await connectDB();

    const user = await User.findOne({ email });
    const isValid = await comparePassword(password, user?.password ?? DUMMY_HASH);

    if (!user || !isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Tu cuenta está pendiente de activación por el administrador' },
        { status: 403 }
      );
    }

    resetRateLimit(rateKey);

    const accessToken = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    const isSecure =
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: TOKEN_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
