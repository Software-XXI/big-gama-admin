import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getUserFromDB } from '@/lib/middleware-helpers';

export async function GET(request: NextRequest) {
  const result = await authenticateRequest(request);
  if (result.error) return result.error;

  const user = await getUserFromDB(result.user!.sub);
  if (!user) {
    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    spreadsheetId: user.spreadsheetId,
    spreadsheetUrl: user.spreadsheetUrl,
  });
}
