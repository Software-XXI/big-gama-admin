import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Trip } from '@/lib/models/trip';
import { User } from '@/lib/models/user';
import { requireRole } from '@/lib/middleware-helpers';
import { calculateRoute } from '@/lib/google-maps';
import { RouteCache } from '@/lib/models/route-cache';
import { getCurrentTimeBucket, normalize } from '@/lib/time-bucket';
import { writeToSheet } from '@/lib/queue';

const MAX_KM = parseInt(process.env.ALERT_MAX_KM || '1000', 10);
const MAX_MIN = parseInt(process.env.ALERT_MAX_HOURS || '12', 10) * 60;

export async function GET(request: NextRequest) {
  const result = await requireRole(request, ['ADMIN', 'CONDUCTOR']);
  if (result.error) return result.error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const brand = searchParams.get('brand');
  const userId = searchParams.get('userId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const flagged = searchParams.get('flagged');

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
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
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

async function getOrCalculateRoute(
  origin: string,
  destination: string
): Promise<{ distanceKm: number; travelTimeMin: number }> {
  const bucket = getCurrentTimeBucket();
  const originNorm = normalize(origin);
  const destNorm = normalize(destination);

  const existing = await RouteCache.findOne({
    originNorm,
    destinationNorm: destNorm,
    dayType: bucket.dayType,
    hourBucket: bucket.hourBucket,
  });

  if (existing) {
    existing.hits += 1;
    await existing.save();
    return {
      distanceKm: existing.distanceKm,
      travelTimeMin: existing.travelTimeMin,
    };
  }

  const route = await calculateRoute(origin, destination, true);

  await RouteCache.create({
    originNorm,
    destinationNorm: destNorm,
    dayType: bucket.dayType,
    hourBucket: bucket.hourBucket,
    distanceKm: route.distanceKm,
    travelTimeMin: route.travelTimeMin,
    originAddress: route.originAddress,
    destinationAddress: route.destinationAddress,
    hits: 1,
  });

  return {
    distanceKm: route.distanceKm,
    travelTimeMin: route.travelTimeMin,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['CONDUCTOR']);
  if (auth.error) return auth.error;

  try {
    const { origin, destination, brand, tipoServicio, quienSolicita = '', numeroOP = '' } = await request.json();

    if (!origin || !destination || !brand || !tipoServicio) {
      return NextResponse.json(
        { error: 'Origen, destino, marca y tipo de servicio son requeridos' },
        { status: 400 }
      );
    }

    if (!['Entrega', 'Recogida'].includes(tipoServicio)) {
      return NextResponse.json(
        { error: 'Tipo de servicio debe ser Entrega o Recogida' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(auth.user!.sub);
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

    const flagged =
      route.distanceKm > MAX_KM || route.travelTimeMin > MAX_MIN;
    let flagReason: string | undefined;

    if (flagged) {
      const reasons: string[] = [];
      if (route.distanceKm > MAX_KM)
        reasons.push(`Kilómetros excesivos (${route.distanceKm} km)`);
      if (route.travelTimeMin > MAX_MIN)
        reasons.push(
          `Tiempo excesivo (${Math.round(route.travelTimeMin / 60)} horas)`
        );
      flagReason = reasons.join('. ');
    }

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

    const sheetRow: (string | number)[] = [
      trip.createdAt.toISOString().split('T')[0],
      origin,
      destination,
      brand,
      route.distanceKm,
      route.travelTimeMin,
      flagged ? 'ALERTA' : 'OK',
      quienSolicita,
      numeroOP,
      tipoServicio,
    ];

    writeToSheet(trip._id.toString(), user._id.toString(), sheetRow).then(
      (success) => {
        if (!success) {
          console.warn(`Sheet write failed for trip ${trip._id} (user: ${user._id}, brand: ${brand})`);
        }
      }
    );

    return NextResponse.json(
      {
        message: 'Viaje registrado exitosamente',
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
