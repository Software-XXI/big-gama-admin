'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, ExternalLink, Plus, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchUsers(params: Record<string, string>) {
  const token = getToken();
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/users?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error fetching users');
  return res.json();
}

async function approveUser(id: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/users/${id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error approving user');
  return res.json();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function loadUsers() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (roleFilter) params.role = roleFilter;
    if (activeFilter) params.isActive = activeFilter;

    fetchUsers(params)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, [roleFilter, activeFilter]);

  async function handleApprove(id: string) {
    try {
      await approveUser(id);
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear conductor');
      }

      setCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      loadUsers();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Error al crear conductor');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear conductor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear conductor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="createName">Nombre</Label>
                <Input id="createName" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Nombre del conductor" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createEmail">Email</Label>
                <Input id="createEmail" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="correo@ejemplo.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createPassword">Contraseña</Label>
                <Input id="createPassword" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {creating ? 'Creando...' : 'Crear conductor'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={roleFilter} onValueChange={(v) => v !== null && setRoleFilter(v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="CONDUCTOR">Conductor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={(v) => v !== null && setActiveFilter(v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Pendientes</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Hoja de cálculo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.data?.map((u: any) => (
                    <TableRow key={u._id}>
                      <TableCell>
                        <Link
                          href={`/users/${u._id}`}
                          className="font-medium hover:underline"
                        >
                          {u.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {u.role === 'ADMIN' ? 'Admin' : 'Conductor'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle2 className="h-4 w-4" /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600 text-sm">
                            <XCircle className="h-4 w-4" /> Pendiente
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.spreadsheetUrl ? (
                          <a
                            href={u.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Abrir
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No vinculada
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!u.isActive && u.role === 'CONDUCTOR' && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(u._id)}
                          >
                            Activar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
