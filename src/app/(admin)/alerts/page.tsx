'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchFlaggedTrips() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/trips?flagged=true&limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching flagged trips');
  return res.json();
}

async function updateTrip(id: string, data: Record<string, unknown>) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/trips/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error updating trip');
  return res.json();
}

export default function AlertsPage() {
  const [trips, setTrips] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetchFlaggedTrips()
      .then(setTrips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleReview(id: string) {
    try {
      await updateTrip(id, { status: 'reviewed', flagged: false });
      load();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Alertas</h1>
        {trips?.total > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {trips.total} pendientes
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : trips?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-lg font-medium">No hay alertas</p>
              <p className="text-sm text-muted-foreground">
                Todos los viajes registrados tienen valores normales
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Origen → Destino</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">Tiempo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips?.data?.map((trip: any) => (
                  <TableRow key={trip._id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(trip.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{trip.driverName}</TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {trip.origin} → {trip.destination}
                    </TableCell>
                    <TableCell>{trip.brand}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {trip.distanceKm?.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {trip.travelTimeMin} min
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {trip.flagReason}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(trip._id)}
                      >
                        Revisado
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
