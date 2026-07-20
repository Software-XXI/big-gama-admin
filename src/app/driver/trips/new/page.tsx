'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlacesAutocomplete } from '@/components/places-autocomplete';
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function NewTripPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [brand, setBrand] = useState('');
  const [tipoServicio, setTipoServicio] = useState<'Entrega' | 'Recogida'>('Entrega');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ origin, destination, brand, tipoServicio }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar viaje');
      }

      setResult(data.trip);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar viaje');
    } finally {
      setLoading(false);
    }
  }

  if (success && result) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Viaje registrado</h2>
          <p className="text-sm text-muted-foreground">
            Los datos se han guardado y enviado a tu hoja de cálculo
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Origen</span>
              <span className="font-medium">{result.origin}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Destino</span>
              <span className="font-medium">{result.destination}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Marca</span>
              <span className="font-medium">{result.brand}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Distancia</span>
              <span className="font-medium">{result.distanceKm} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tiempo</span>
              <span className="font-medium">{result.travelTimeMin} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tipo de servicio</span>
              <span className="font-medium">{result.tipoServicio}</span>
            </div>
            {result.flagged && (
              <div className="flex items-center gap-2 pt-2 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{result.flagReason}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => {
            setSuccess(false);
            setResult(null);
            setOrigin('');
            setDestination('');
            setBrand('');
            setTipoServicio('Entrega');
          }}>
            Otro viaje
          </Button>
          <Button className="flex-1" onClick={() => router.push('/driver/trips')}>
            Ver historial
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Nuevo viaje</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registrar viaje</CardTitle>
        </CardHeader>
        <CardContent>
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origen</Label>
                <PlacesAutocomplete id="origin" value={origin} onChange={setOrigin} placeholder="Ciudad o dirección de salida" disabled={loading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destino</Label>
                <PlacesAutocomplete id="destination" value={destination} onChange={setDestination} placeholder="Ciudad o dirección de llegada" disabled={loading} />
              </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" placeholder="Ej: Jose Cuervo, Jack Daniels, ..." value={brand} onChange={(e) => setBrand(e.target.value)} required disabled={loading} list="brands" />
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
                  <input type="radio" name="tipoServicio" value="Entrega" checked={tipoServicio === 'Entrega'} onChange={() => setTipoServicio('Entrega')} disabled={loading} className="h-4 w-4" />
                  <span className="text-sm">Entrega</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipoServicio" value="Recogida" checked={tipoServicio === 'Recogida'} onChange={() => setTipoServicio('Recogida')} disabled={loading} className="h-4 w-4" />
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

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculando ruta con Google Maps...
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando...</>
              ) : (
                'Registrar viaje'
              )}
            </Button>
          </form>
          </APIProvider>
        </CardContent>
      </Card>
    </div>
  );
}
