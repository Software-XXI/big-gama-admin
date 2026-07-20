import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Trip } from '@/lib/models/trip';
import { requireRole } from '@/lib/middleware-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(request, ['ADMIN', 'CONDUCTOR']);
  if (result.error) return result.error;

  const { id } = await params;
  await connectDB();

  const trip = await Trip.findById(id).lean();
  if (!trip) {
    return NextResponse.json(
      { error: 'Viaje no encontrado' },
      { status: 404 }
    );
  }

  if (result.user!.role === 'CONDUCTOR' && trip.userId.toString() !== result.user!.sub) {
    return NextResponse.json(
      { error: 'No tienes permiso para ver este viaje' },
      { status: 403 }
    );
  }

  return NextResponse.json(trip);
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

    const allowedFields = [
      'origin',
      'destination',
      'brand',
      'distanceKm',
      'travelTimeMin',
      'status',
    ];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.flagged !== undefined) {
      updateData.flagged = body.flagged;
    }

    await connectDB();

    const trip = await Trip.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();

    if (!trip) {
      return NextResponse.json(
        { error: 'Viaje no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Update trip error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
