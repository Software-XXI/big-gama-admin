export interface TimeBucket {
  dayType: 'weekday' | 'weekend';
  hourBucket: number;
  label: string;
}

export function getCurrentTimeBucket(date: Date = new Date()): TimeBucket {
  const day = date.getDay();
  const dayType: 'weekday' | 'weekend' =
    day === 0 || day === 6 ? 'weekend' : 'weekday';

  const hour = date.getHours();
  const hourBucket = Math.floor(hour / 2);

  const start = String(hourBucket * 2).padStart(2, '0');
  const end = String(hourBucket * 2 + 1).padStart(2, '0');

  return {
    dayType,
    hourBucket,
    label: `${start}:00-${end}:59`,
  };
}

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[áäàâ]/g, 'a')
    .replace(/[éëèê]/g, 'e')
    .replace(/[íïìî]/g, 'i')
    .replace(/[óöòô]/g, 'o')
    .replace(/[úüùû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s,.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
