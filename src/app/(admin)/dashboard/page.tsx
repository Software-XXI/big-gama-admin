'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Route,
  Clock,
  Truck,
  AlertTriangle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchStats() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/trips/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching stats');
  return res.json();
}

async function fetchRecentTrips() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/trips?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching trips');
  return res.json();
}

async function fetchPendingDrivers() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/users?isActive=false&role=CONDUCTOR`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching users');
  return res.json();
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentTrips, setRecentTrips] = useState<any>(null);
  const [pendingDrivers, setPendingDrivers] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchRecentTrips(), fetchPendingDrivers()])
      .then(([s, t, u]) => {
        setStats(s);
        setRecentTrips(t);
        setPendingDrivers(u);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Viajes totales',
      value: stats?.totalTrips ?? 0,
      icon: Route,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Kilómetros totales',
      value: `${(stats?.totalKm ?? 0).toLocaleString()} km`,
      icon: Truck,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Tiempo total',
      value: `${Math.round((stats?.totalTimeMin ?? 0) / 60)} h`,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Pendientes activación',
      value: pendingDrivers?.total ?? 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Viajes recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTrips?.data?.length > 0 ? (
              <div className="space-y-3">
                {recentTrips.data.map((trip: any) => (
                  <div
                    key={trip._id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {trip.origin} → {trip.destination}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {trip.driverName} · {trip.brand}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {trip.distanceKm} km
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin viajes aún</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Marcas populares</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.byBrand?.length > 0 ? (
              <div className="space-y-3">
                {stats.byBrand.slice(0, 5).map((brand: any) => (
                  <div
                    key={brand.brand}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{brand.brand}</span>
                    <div className="text-right text-xs text-muted-foreground">
                      <span>{brand.count} viajes</span>
                      <span className="ml-2">{brand.totalKm} km</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
