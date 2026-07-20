'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertTriangle, Save } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchTrip(id: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/trips/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Trip not found');
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

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    brand: '',
    distanceKm: 0,
    travelTimeMin: 0,
    status: '',
  });

  useEffect(() => {
    fetchTrip(id)
      .then((data) => {
        setTrip(data);
        setForm({
          origin: data.origin,
          destination: data.destination,
          brand: data.brand,
          distanceKm: data.distanceKm,
          travelTimeMin: data.travelTimeMin,
          status: data.status,
        });
      })
      .catch(() => router.push('/trips'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateTrip(id, form);
      setTrip(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-6 w-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!trip) return null;

  const fields = [
    { label: 'Conductor', value: trip.driverName },
    { label: 'Origen', value: trip.origin, key: 'origin' },
    { label: 'Destino', value: trip.destination, key: 'destination' },
    { label: 'Marca', value: trip.brand, key: 'brand' },
    { label: 'Distancia', value: `${trip.distanceKm} km`, key: 'distanceKm' },
    { label: 'Tiempo', value: `${trip.travelTimeMin} min`, key: 'travelTimeMin' },
    {
      label: 'Creado',
      value: new Date(trip.createdAt).toLocaleString(),
    },
    { label: 'Estado', value: trip.flagged ? 'Con alerta' : 'Normal', key: 'status' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/trips')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Detalle del viaje</h1>
        {trip.flagged && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Alerta: {trip.flagReason}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Información del viaje</CardTitle>
            <Button
              variant={editing ? 'default' : 'outline'}
              size="sm"
              onClick={() => (editing ? handleSave() : setEditing(true))}
              disabled={saving}
            >
              {editing ? (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </>
              ) : (
                'Editar'
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((f) => (
              <div key={f.label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{f.label}</span>
                {editing && f.key ? (
                  <Input
                    className="w-48 h-8 text-sm text-right"
                    value={String((form as any)[f.key] ?? '')}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [f.key!]:
                          f.key === 'distanceKm' || f.key === 'travelTimeMin'
                            ? Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                ) : (
                  <span className="text-sm font-medium">{f.value}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
