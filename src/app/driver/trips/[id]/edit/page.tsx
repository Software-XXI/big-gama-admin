'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlacesAutocomplete } from '@/components/places-autocomplete';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [brand, setBrand] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'Entrega' | 'Recogida'>('Entrega');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/api/trips/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar viaje');
        return res.json();
      })
      .then((trip) => {
        setOrigin(trip.origin);
        setDestination(trip.destination);
        setBrand(trip.brand);
        setTipoServicio(trip.tipoServicio || 'Entrega');
      })
      .catch(() => router.push('/driver/trips'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/trips/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ origin, destination, brand, tipoServicio }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar viaje');
      }

      setSuccess(true);
      setTimeout(() => router.push('/driver/trips'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar viaje');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Card><CardContent className="p-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Editar viaje</h1>
      </div>

      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modificar viaje</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origen</Label>
                <PlacesAutocomplete id="origin" value={origin} onChange={setOrigin} placeholder="Ciudad o dirección de salida" disabled={saving} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destino</Label>
                <PlacesAutocomplete id="destination" value={destination} onChange={setDestination} placeholder="Ciudad o dirección de llegada" disabled={saving} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" placeholder="Ej: Jose Cuervo, Jack Daniels, ..." value={brand} onChange={(e) => setBrand(e.target.value)} required disabled={saving} list="brands" />
                <datalist id="brands">
                  <option value="Jose Cuervo" />
                  <option value="Jack Daniels" />
                  <option value="Bacardi" />
                  <option value="Absolut" />
                  <option value="Johnnie Walker" />
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>Tipo de servicio</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipoServicio" value="Entrega" checked={tipoServicio === 'Entrega'} onChange={() => setTipoServicio('Entrega')} disabled={saving} className="h-4 w-4" />
                    <span className="text-sm">Entrega</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tipoServicio" value="Recogida" checked={tipoServicio === 'Recogida'} onChange={() => setTipoServicio('Recogida')} disabled={saving} className="h-4 w-4" />
                    <span className="text-sm">Recogida</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive font-medium p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium p-3 rounded-lg bg-green-600/10">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Viaje actualizado correctamente. Redirigiendo...
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </APIProvider>
    </div>
  );
}