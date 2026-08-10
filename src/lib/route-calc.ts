import { calculateRoute } from './google-maps';
import { RouteCache } from './models/route-cache';
import { getCurrentTimeBucket, normalize } from './time-bucket';

const MAX_KM = parseInt(process.env.ALERT_MAX_KM || '1000', 10);
const MAX_MIN = parseInt(process.env.ALERT_MAX_HOURS || '12', 10) * 60;

export async function getOrCalculateRoute(
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

export function evaluateFlags(
  distanceKm: number,
  travelTimeMin: number
): { flagged: boolean; flagReason?: string } {
  const flagged = distanceKm > MAX_KM || travelTimeMin > MAX_MIN;
  let flagReason: string | undefined;

  if (flagged) {
    const reasons: string[] = [];
    if (distanceKm > MAX_KM)
      reasons.push(`Kilómetros excesivos (${distanceKm} km)`);
    if (travelTimeMin > MAX_MIN)
      reasons.push(
        `Tiempo excesivo (${Math.round(travelTimeMin / 60)} horas)`
      );
    flagReason = reasons.join('. ');
  }

  return { flagged, flagReason };
}
