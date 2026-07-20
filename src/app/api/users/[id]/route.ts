import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id).select('-password').lean();
  if (!user) {
    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ['name', 'email', 'isActive', 'spreadsheetId', 'spreadsheetUrl'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
