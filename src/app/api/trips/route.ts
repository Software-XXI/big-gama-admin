import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Trip } from '@/lib/models/trip';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';
import { getOrCalculateRoute, evaluateFlags } from '@/lib/route-calc';
import { buildSheetRow } from '@/lib/google-sheets';
import { writeToSheet } from '@/lib/queue';
import { formatZodError, tripCreateSchema, tripQuerySchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const result = await requireRole(request, ['ADMIN', 'CONDUCTOR']);
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const parsed = tripQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { page, limit, brand, userId, startDate, endDate, flagged } = parsed.data;

  await connectDB();

  const filter: Record<string, unknown> = {};

  if (result.user!.role === 'CONDUCTOR') {
    filter.userId = result.user!.sub;
  } else if (userId) {
    filter.userId = userId;
  }

  if (brand) filter.brand = brand;
  if (flagged === 'true') filter.flagged = true;
  if (flagged === 'false') filter.flagged = false;

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    filter.createdAt = dateFilter;
  }

  const skip = (page - 1) * limit;

  const [trips, total] = await Promise.all([
    Trip.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Trip.countDocuments(filter),
  ]);

  return NextResponse.json({
    data: trips,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'CONDUCTOR']);
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => null);
    const parsed = tripCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const {
      origin,
      destination,
      brand,
      tipoServicio,
      quienSolicita,
      numeroOP,
      userId,
    } = parsed.data;

    await connectDB();

    let tripUserId = auth.user!.sub;
    if (auth.user!.role === 'ADMIN') {
      if (!userId) {
        return NextResponse.json(
          { error: 'Debes seleccionar un conductor' },
          { status: 400 }
        );
      }
      tripUserId = userId;
    }

    const user = await User.findById(tripUserId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    let route;
    try {
      route = await getOrCalculateRoute(origin, destination);
    } catch (mapError) {
      return NextResponse.json(
        {
          error:
            mapError instanceof Error
              ? mapError.message
              : 'Error al calcular la ruta',
        },
        { status: 502 }
      );
    }

    const { flagged, flagReason } = evaluateFlags(
      route.distanceKm,
      route.travelTimeMin
    );

    const trip = await Trip.create({
      origin,
      destination,
      brand,
      distanceKm: route.distanceKm,
      travelTimeMin: route.travelTimeMin,
      userId: user._id,
      driverName: user.name,
      status: flagged ? 'flagged' : 'completed',
      flagged,
      flagReason,
      tipoServicio,
      quienSolicita,
      numeroOP,
    });

    const sheetRow = buildSheetRow({
      createdAt: trip.createdAt,
      origin,
      destination,
      brand,
      distanceKm: route.distanceKm,
      travelTimeMin: route.travelTimeMin,
      flagged,
      quienSolicita,
      numeroOP,
      tipoServicio,
    });

    const sheetWritten = await writeToSheet(trip._id.toString(), user._id.toString(), sheetRow);

    return NextResponse.json(
      {
        message: 'Viaje registrado exitosamente',
        sheetWritten,
        trip: {
          _id: trip._id,
          origin: trip.origin,
          destination: trip.destination,
          brand: trip.brand,
          distanceKm: trip.distanceKm,
          travelTimeMin: trip.travelTimeMin,
          status: trip.status,
          flagged: trip.flagged,
          flagReason: trip.flagReason,
          tipoServicio: trip.tipoServicio,
          quienSolicita: trip.quienSolicita,
          numeroOP: trip.numeroOP,
          createdAt: trip.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create trip error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
