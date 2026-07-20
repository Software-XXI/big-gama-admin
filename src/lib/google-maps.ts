const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

export interface DistanceMatrixResult {
  distanceKm: number;
  travelTimeMin: number;
  originAddress: string;
  destinationAddress: string;
}

export async function calculateRoute(
  origin: string,
  destination: string,
  departureNow: boolean = true
): Promise<DistanceMatrixResult> {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY no configurada');
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('origins', origin);
  url.searchParams.set('destinations', destination);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('units', 'metric');

  if (departureNow) {
    url.searchParams.set('departure_time', 'now');
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${data.status}`);
  }

  const element = data.rows[0]?.elements[0];
  if (!element || element.status !== 'OK') {
    throw new Error(
      `No se pudo calcular la ruta entre "${origin}" y "${destination}"`
    );
  }

  const distanceKm =
    Math.round((element.distance.value / 1000) * 100) / 100;

  const durationSeconds = element.duration_in_traffic?.value ?? element.duration.value;
  const travelTimeMin = Math.round(durationSeconds / 60);

  return {
    distanceKm,
    travelTimeMin,
    originAddress: data.origin_addresses[0] || origin,
    destinationAddress: data.destination_addresses[0] || destination,
  };
}
