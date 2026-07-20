'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ExternalLink, Save, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchUser(id: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('User not found');
  return res.json();
}

async function fetchUserTrips(userId: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/trips?userId=${userId}&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching trips');
  return res.json();
}

async function updateUser(id: string, data: Record<string, unknown>) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error updating user');
  return res.json();
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [sheetId, setSheetId] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');

  useEffect(() => {
    Promise.all([fetchUser(id), fetchUserTrips(id)])
      .then(([u, t]) => {
        setUser(u);
        setTrips(t);
        setSheetId(u.spreadsheetId || '');
        setSheetUrl(u.spreadsheetUrl || '');
      })
      .catch(() => router.push('/users'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleLinkSheet() {
    setSaving(true);
    try {
      const updated = await updateUser(id, {
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl || `https://docs.google.com/spreadsheets/d/${sheetId}`,
      });
      setUser(updated);
      setSheetId(updated.spreadsheetId || '');
      setSheetUrl(updated.spreadsheetUrl || '');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSheet() {
    setCreatingSheet(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/users/${id}/create-sheet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear hoja');
      }
      const updated = await res.json();
      setUser(updated);
      setSheetId(updated.spreadsheetId || '');
      setSheetUrl(updated.spreadsheetUrl || '');
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingSheet(false);
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
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/users')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
          {user.role === 'ADMIN' ? 'Admin' : 'Conductor'}
        </Badge>
        {user.isActive ? (
          <Badge variant="default" className="bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Activo
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Pendiente
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información del usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Registro</span>
              <span className="text-sm font-medium">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hoja de cálculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sheetId">ID de Google Sheet</Label>
              <Input
                id="sheetId"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheetUrl">URL (opcional)</Label>
              <Input
                id="sheetUrl"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleLinkSheet} disabled={saving || !sheetId} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Vincular hoja'}
              </Button>
              <Button onClick={handleCreateSheet} disabled={creatingSheet} variant="outline" className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {creatingSheet ? 'Asignando...' : 'Usar hoja global'}
              </Button>
            </div>
            {user.spreadsheetUrl && (
              <div className="pt-2">
                <a
                  href={user.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" /> Abrir hoja de cálculo
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Viajes recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {trips?.data?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">Tiempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.data.map((t: any) => (
                  <TableRow key={t._id}>
                    <TableCell className="text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate">{t.origin}</TableCell>
                    <TableCell className="max-w-[100px] truncate">{t.destination}</TableCell>
                    <TableCell>{t.brand}</TableCell>
                    <TableCell className="text-right">{t.distanceKm?.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{t.travelTimeMin} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Sin viajes registrados</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
