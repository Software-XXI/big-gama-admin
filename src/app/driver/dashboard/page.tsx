'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Route, Clock, Truck, MapPin } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchMyTrips() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/trips?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching trips');
  return res.json();
}

export default function DriverDashboard() {
  const [trips, setTrips] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTrips()
      .then(setTrips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalKm = trips?.data?.reduce((s: number, t: any) => s + t.distanceKm, 0) ?? 0;
  const totalTime = trips?.data?.reduce((s: number, t: any) => s + t.travelTimeMin, 0) ?? 0;

  const cards = [
    {
      title: 'Viajes',
      value: trips?.total ?? 0,
      icon: Route,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Kilómetros',
      value: `${totalKm.toFixed(0)} km`,
      icon: Truck,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Tiempo',
      value: `${Math.round(totalTime / 60)} h`,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Mis viajes</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu actividad</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4 text-center">
              <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-2`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-lg font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimos viajes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : trips?.data?.length > 0 ? (
            <div className="space-y-3">
              {trips.data.map((trip: any) => (
                <div key={trip._id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {trip.origin} → {trip.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trip.brand} · {trip.distanceKm} km · {trip.travelTimeMin} min
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Route className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aún no has registrado viajes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
