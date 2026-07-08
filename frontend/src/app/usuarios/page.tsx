"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateUsuarioDialog } from "@/components/usuarios/create-usuario-dialog";
import type { UsuarioEquipo } from "@/components/usuarios/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const ROL_LABEL: Record<UsuarioEquipo["rol"], string> = {
  TESORERO: "Tesorero",
  SECRETARIA: "Secretaria",
};

export default function UsuariosPage() {
  const { usuario, ready } = useRequireAuth();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [equipo, setEquipo] = useState<UsuarioEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadEquipo = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<UsuarioEquipo[]>("/usuarios", { token: accessToken });
      setEquipo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el equipo");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadEquipo();
  }, [loadEquipo]);

  async function toggleActivo(miembro: UsuarioEquipo) {
    if (!accessToken) return;
    setTogglingId(miembro.id);

    try {
      const actualizado = await apiFetch<UsuarioEquipo>(`/usuarios/${miembro.id}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ activo: !miembro.activo }),
      });
      setEquipo((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el usuario");
    } finally {
      setTogglingId(null);
    }
  }

  if (!ready || !usuario) {
    return null;
  }

  if (usuario.rol !== "PASTOR") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para ver esta página.</p>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="h-full bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Equipo de la iglesia</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestiona tesoreros y secretarias de tu iglesia.</p>
          </div>
          <CreateUsuarioDialog onCreated={() => loadEquipo()} />
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando equipo...
            </div>
          ) : equipo.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Todavía no has agregado a nadie de tu equipo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipo.map((miembro) => (
                  <TableRow key={miembro.id}>
                    <TableCell className="font-medium text-foreground">
                      {miembro.nombre} {miembro.apellido}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{miembro.username}</TableCell>
                    <TableCell className="text-muted-foreground">{miembro.email}</TableCell>
                    <TableCell>{ROL_LABEL[miembro.rol]}</TableCell>
                    <TableCell>
                      <span
                        className={
                          miembro.activo
                            ? "rounded-full bg-accent px-2 py-1 text-xs font-medium text-primary"
                            : "rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {miembro.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActivo(miembro)}
                        disabled={togglingId === miembro.id}
                      >
                        {togglingId === miembro.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : miembro.activo ? (
                          "Desactivar"
                        ) : (
                          "Activar"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </main>
  );
}
