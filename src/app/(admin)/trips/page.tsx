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
import { Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

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

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (brandFilter) params.brand = brandFilter;
    if (flaggedFilter) params.flagged = flaggedFilter;

    fetchTrips(params)
      .then(setTrips)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, brandFilter, flaggedFilter]);

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
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
