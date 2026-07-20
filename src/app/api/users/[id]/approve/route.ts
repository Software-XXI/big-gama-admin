import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(request, ['ADMIN']);
  if (result.error) return result.error;

  try {
    const { id } = await params;

    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    )
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Conductor activado exitosamente',
      user,
    });
  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
