"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NotificacionItem } from "@/components/red/notificacion-item";
import { tieneAccesoRed } from "@/components/red/permisos";
import type { Notificacion, Paginado } from "@/components/red/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { ApiError, apiFetch } from "@/lib/api";

export default function NotificacionesPage() {
  const { usuario, ready } = useRequireAuth();
  const router = useRouter();

  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceso = tieneAccesoRed(usuario);

  const pedir = useCallback(
    (p: number) =>
      apiFetch<Paginado<Notificacion>>(`/notificaciones?pagina=${p}${soloNoLeidas ? "&soloNoLeidas=true" : ""}`),
    [soloNoLeidas],
  );

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pedir(1);
      setItems(res.items);
      setTotal(res.total);
      setPagina(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  }, [pedir]);

  useEffect(() => {
    if (ready && acceso) void recargar();
  }, [ready, acceso, recargar]);

  useRealtimeEvent("notificacion:nueva", () => {
    void recargar();
  });

  async function cargarMas() {
    setCargandoMas(true);
    try {
      const res = await pedir(pagina + 1);
      setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((x) => x.id === n.id))]);
      setTotal(res.total);
      setPagina(pagina + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar más notificaciones");
    } finally {
      setCargandoMas(false);
    }
  }

  async function abrir(n: Notificacion) {
    if (n.leidaEn === null) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leidaEn: new Date().toISOString() } : x)));
      apiFetch(`/notificaciones/${n.id}/leer`, { method: "POST" }).catch(() => {});
    }
    if (n.url) router.push(n.url);
  }

  async function marcarTodas() {
    try {
      await apiFetch("/notificaciones/leer-todas", { method: "POST" });
      await recargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron marcar como leídas");
    }
  }

  if (!ready || !usuario) return null;

  if (!acceso) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para ver esta página.</p>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </main>
    );
  }

  const hayNoLeidas = items.some((n) => n.leidaEn === null);

  return (
    <main className="h-full bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-xl font-semibold text-foreground">Notificaciones</h1>
          {hayNoLeidas && (
            <Button type="button" variant="outline" size="sm" onClick={marcarTodas}>
              <CheckCheck aria-hidden />
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <Switch checked={soloNoLeidas} onCheckedChange={setSoloNoLeidas} aria-label="Solo no leídas" />
          Solo no leídas
        </label>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {soloNoLeidas ? "No tienes notificaciones sin leer." : "No tienes notificaciones."}
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-1 rounded-2xl border border-border bg-card p-2 shadow-sm">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificacionItem notificacion={n} onClick={() => abrir(n)} />
                </li>
              ))}
            </ul>
            {items.length < total && (
              <div className="mt-6 flex justify-center">
                <Button type="button" variant="outline" onClick={cargarMas} disabled={cargandoMas}>
                  {cargandoMas ? <Loader2 className="animate-spin" /> : "Ver más"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
