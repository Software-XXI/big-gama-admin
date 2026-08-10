'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Route, MapPin, AlertTriangle, Search, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function DriverTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState('');

  function loadTrips() {
    setLoading(true);
    const token = getToken();
    fetch(`${API_URL}/api/trips?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setTrips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTrips();
  }, []);

  async function handleDelete(trip: any) {
    if (!window.confirm('¿Seguro que quieres eliminar este viaje?')) return;
    setDeletingId(trip._id);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/trips/${trip._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar');
      }
      setTrips((prev: any) => ({
        ...prev,
        data: prev.data.filter((t: any) => t._id !== trip._id),
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar viaje');
    } finally {
      setDeletingId('');
    }
  }

  const filtered = trips?.data?.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.origin.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q) ||
      t.brand.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Historial de viajes</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por origen, destino o marca..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12">
          <Route className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'Sin resultados para tu búsqueda' : 'No hay viajes registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((trip: any) => (
            <Card key={trip._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="truncate">{trip.origin}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="truncate">{trip.destination}</span>
                    </div>
                  </div>
                  {trip.flagged && (
                    <Badge variant="destructive" className="ml-2 flex-shrink-0 gap-1 text-xs">
                      <AlertTriangle className="h-3 w-3" /> Alerta
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{trip.brand}</span>
                  <span>·</span>
                  <span>{trip.distanceKm} km</span>
                  <span>·</span>
                  <span>{trip.travelTimeMin} min</span>
                  <span>·</span>
                  <span>{new Date(trip.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/driver/trips/${trip._id}/edit`)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(trip)}
                    disabled={deletingId === trip._id}
                  >
                    {deletingId === trip._id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
