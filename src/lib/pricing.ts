export function calculateTripPrice(distanceKm: number, travelTimeMin: number): number {
  let base = 10000;
  if (distanceKm <= 3) base = 10000;
  else if (distanceKm <= 5) base = 20000;
  else if (distanceKm <= 8) base = 30000;
  else if (distanceKm <= 11) base = 40000;
  else if (distanceKm <= 20) base = 60000;
  else base = 80000;

  let total = base;
  if (travelTimeMin >= 15) total += 10000;

  return Math.min(80000, total);
}
