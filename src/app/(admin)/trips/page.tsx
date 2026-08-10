'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, ChevronLeft, ChevronRight, AlertTriangle, Trash2, Loader2,
  Plus, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { calculateTripPrice } from '@/lib/pricing';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { APIProvider } from '@vis.gl/react-google-maps';
import { PlacesAutocomplete } from '@/components/places-autocomplete';

function formatPrice(price: number) {
  return `${Math.round(price / 1000)}k`;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchTrips(params: Record<string, string>) {
  const token = getToken();
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/trips?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching trips');
  return res.json();
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [flaggedFilter, setFlaggedFilter] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [form, setForm] = useState({
    userId: '',
    origin: '',
    destination: '',
    brand: '',
    tipoServicio: 'Entrega' as 'Entrega' | 'Recogida',
  });

  function loadTrips() {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (brandFilter) params.brand = brandFilter;
    if (flaggedFilter) params.flagged = flaggedFilter;

    fetchTrips(params)
      .then(setTrips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTrips();
  }, [page, brandFilter, flaggedFilter]);

  useEffect(() => {
    if (!createOpen) return;
    const token = getToken();
    fetch(`${API_URL}/api/users?role=CONDUCTOR&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setDrivers(data.data || []))
      .catch(console.error);
  }, [createOpen]);

  async function handleCreateTrip() {
    setCreateError('');
    setCreateSuccess('');
    if (!form.userId) {
      setCreateError('Selecciona un conductor');
      return;
    }
    setCreating(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear viaje');
      }
      setCreateSuccess(
        `Viaje creado${data.sheetWritten ? ' y registrado en la hoja' : ''}`
      );
      setForm({ userId: '', origin: '', destination: '', brand: '', tipoServicio: 'Entrega' });
      loadTrips();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Error al crear viaje');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(trip: any) {
    if (!window.confirm(`¿Seguro que quieres eliminar el viaje de ${trip.driverName}?`)) return;
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
      loadTrips();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar viaje');
    } finally {
      setDeletingId('');
    }
  }

  const filteredTrips = trips?.data?.filter((t: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.origin.toLowerCase().includes(q) ||
      t.destination.toLowerCase().includes(q) ||
      t.driverName.toLowerCase().includes(q) ||
      t.brand.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Viajes</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear viaje
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear viaje</DialogTitle>
            </DialogHeader>
            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateTrip();
                }}
                className="space-y-4"
              >
              <div className="space-y-2">
                <Label htmlFor="tripDriver">Conductor</Label>
                <Select
                  value={form.userId}
                  onValueChange={(v) => v && setForm((p) => ({ ...p, userId: v }))}
                >
                  <SelectTrigger id="tripDriver">
                    <SelectValue placeholder="Selecciona un conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.length === 0 && (
                      <SelectItem value="no-drivers" disabled>
                        No hay conductores
                      </SelectItem>
                    )}
                    {drivers.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="tripOrigin">Origen</Label>
                  <PlacesAutocomplete
                    id="tripOrigin"
                    value={form.origin}
                    onChange={(v) => setForm((p) => ({ ...p, origin: v }))}
                    placeholder="Ciudad o dirección de salida"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tripDestination">Destino</Label>
                  <PlacesAutocomplete
                    id="tripDestination"
                    value={form.destination}
                    onChange={(v) => setForm((p) => ({ ...p, destination: v }))}
                    placeholder="Ciudad o dirección de llegada"
                    disabled={creating}
                  />
                </div>
              <div className="space-y-2">
                <Label htmlFor="tripBrand">Marca</Label>
                <Input
                  id="tripBrand"
                  placeholder="Ej: Jose Cuervo, Jack Daniels..."
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  required
                  list="trip-brands"
                />
                <datalist id="trip-brands">
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
                    <input
                      type="radio"
                      name="tripTipo"
                      value="Entrega"
                      checked={form.tipoServicio === 'Entrega'}
                      onChange={() => setForm((p) => ({ ...p, tipoServicio: 'Entrega' }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Entrega</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tripTipo"
                      value="Recogida"
                      checked={form.tipoServicio === 'Recogida'}
                      onChange={() => setForm((p) => ({ ...p, tipoServicio: 'Recogida' }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Recogida</span>
                  </label>
                </div>
              </div>
              {createError && (
                <div className="flex items-center gap-2 text-sm text-destructive font-medium p-3 rounded-lg bg-destructive/10">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium p-3 rounded-lg bg-green-600/10">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  {createSuccess}
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {creating ? 'Creando...' : 'Crear viaje'}
                </Button>
              </DialogFooter>
              </form>
            </APIProvider>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por origen, destino, conductor, marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={brandFilter} onValueChange={(v) => v !== null && setBrandFilter(v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todas las marcas</SelectItem>
                {[...new Set(trips?.data?.map((t: any) => t.brand) || [])].map(
                  (b: any) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select value={flaggedFilter} onValueChange={(v) => v !== null && setFlaggedFilter(v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos</SelectItem>
                <SelectItem value="true">Con alerta</SelectItem>
                <SelectItem value="false">Sin alerta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-right">Tiempo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No hay viajes registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrips?.map((trip: any) => (
                      <TableRow key={trip._id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(trip.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/trips/${trip._id}`}
                            className="hover:underline"
                          >
                            {trip.driverName}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">
                          {trip.origin}
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate">
                          {trip.destination}
                        </TableCell>
                        <TableCell>{trip.brand}</TableCell>
                        <TableCell className="text-right">
                          {trip.distanceKm?.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {trip.travelTimeMin} min
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatPrice(calculateTripPrice(trip.distanceKm, trip.travelTimeMin))}
                        </TableCell>
                        <TableCell className="text-center">
                          {trip.flagged ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Alerta
                            </Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(trip)}
                            disabled={deletingId === trip._id}
                          >
                            {deletingId === trip._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {trips && trips.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {trips.totalPages} ({trips.total} viajes)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= trips.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
