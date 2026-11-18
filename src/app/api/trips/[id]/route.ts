import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Trip } from '@/lib/models/trip';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';
import { getOrCalculateRoute, evaluateFlags } from '@/lib/route-calc';
import {
  buildSheetRow,
  updateTripRow,
  deleteSpreadsheetRow,
} from '@/lib/google-sheets';
import { formatZodError, tripUpdateSchema } from '@/lib/validation';

const CONDUCTOR_FIELDS = ['origin', 'destination', 'brand', 'tipoServicio'];
const ADMIN_FIELDS = [
  ...CONDUCTOR_FIELDS,
  'distanceKm',
  'travelTimeMin',
  'status',
  'flagged',
];

function checkOwnership(role: string, tripUserId: string, authSub: string) {
  return role === 'ADMIN' || tripUserId === authSub;
}

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
  const result = await requireRole(request, ['ADMIN', 'CONDUCTOR']);
  if (result.error) return result.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = tripUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const data = parsed.data;

    await connectDB();

    const existing = await Trip.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Viaje no encontrado' },
        { status: 404 }
      );
    }

    const role = result.user!.role;
    if (!checkOwnership(role, existing.userId.toString(), result.user!.sub)) {
      return NextResponse.json(
        { error: 'No tienes permiso para editar este viaje' },
        { status: 403 }
      );
    }

    const allowed = role === 'ADMIN' ? ADMIN_FIELDS : CONDUCTOR_FIELDS;
    const updateData: Record<string, unknown> = {};

    for (const field of allowed) {
      const value = data[field as keyof typeof data];
      if (value !== undefined) {
        updateData[field] = value;
      }
    }

    const originChanged = data.origin !== undefined && data.origin !== existing.origin;
    const destinationChanged =
      data.destination !== undefined && data.destination !== existing.destination;

    if ((originChanged || destinationChanged) && data.origin && data.destination) {
      let route;
      try {
        route = await getOrCalculateRoute(data.origin, data.destination);
      } catch (mapError) {
        return NextResponse.json(
          {
            error:
              mapError instanceof Error
                ? mapError.message
                : 'Error al recalcular la ruta',
          },
          { status: 502 }
        );
      }

      updateData.distanceKm = route.distanceKm;
      updateData.travelTimeMin = route.travelTimeMin;

      const { flagged, flagReason } = evaluateFlags(route.distanceKm, route.travelTimeMin);
      updateData.flagged = flagged;
      updateData.flagReason = flagReason;
      updateData.status = flagged ? 'flagged' : 'completed';
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No hay campos válidos para actualizar' },
        { status: 400 }
      );
    }

    const trip = await Trip.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .select('-__v')
      .lean();

    if (!trip) {
      return NextResponse.json(
        { error: 'Viaje no encontrado' },
        { status: 404 }
      );
    }

    if (trip.spreadsheetRow) {
      try {
        const user = await User.findById(trip.userId).select('spreadsheetId sheetTab');
        const sheetTab = trip.spreadsheetTab || user?.sheetTab || 'Viajes';
        if (user?.spreadsheetId) {
          const sheetRow = buildSheetRow(trip);
          await updateTripRow(
            user.spreadsheetId,
            sheetTab,
            trip.spreadsheetRow,
            sheetRow
          );
        }
      } catch (sheetErr) {
        console.error(
          'Update trip: failed to sync spreadsheet row:',
          sheetErr instanceof Error ? sheetErr.message : sheetErr
        );
      }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole(request, ['ADMIN', 'CONDUCTOR']);
  if (result.error) return result.error;

  try {
    const { id } = await params;

    await connectDB();

    const trip = await Trip.findById(id);
    if (!trip) {
      return NextResponse.json(
        { error: 'Viaje no encontrado' },
        { status: 404 }
      );
    }

    const role = result.user!.role;
    if (!checkOwnership(role, trip.userId.toString(), result.user!.sub)) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este viaje' },
        { status: 403 }
      );
    }

    if (trip.spreadsheetRow) {
      try {
        const user = await User.findById(trip.userId).select('spreadsheetId sheetTab');
        const sheetTab = trip.spreadsheetTab || user?.sheetTab || 'Viajes';
        if (user?.spreadsheetId) {
          await deleteSpreadsheetRow(
            user.spreadsheetId,
            sheetTab,
            trip.spreadsheetRow
          );
        }
      } catch (sheetErr) {
        console.error(
          'Delete trip: failed to delete spreadsheet row:',
          sheetErr instanceof Error ? sheetErr.message : sheetErr
        );
      }
    }

    await Trip.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Viaje eliminado' });
  } catch (error) {
    console.error('Delete trip error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}