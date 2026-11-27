"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificacionItem } from "@/components/red/notificacion-item";
import type { Notificacion, Paginado } from "@/components/red/types";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { apiFetch, refrescarUsuario } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Campana del header (todos los planes, MANAGER y USUARIO). El contador se
 * pide al montar y se refresca con el evento realtime `notificacion:nueva`
 * (sin confiar en su payload). La lista solo se pide al abrir el panel.
 */
export function NotificacionesBell() {
  const router = useRouter();
  const usuarioId = useAuthStore((s) => s.usuario?.id);

  const [noLeidas, setNoLeidas] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);

  const refrescarContador = useCallback(async () => {
    try {
      const { total } = await apiFetch<{ total: number }>("/notificaciones/no-leidas");
      setNoLeidas(total);
    } catch {
      // No crítico: el badge queda como estaba.
    }
  }, []);

  const cargarPagina = useCallback(async (p: number) => {
    setCargando(true);
    try {
      const res = await apiFetch<Paginado<Notificacion>>(`/notificaciones?pagina=${p}`);
      setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items.filter((n) => !prev.some((x) => x.id === n.id))]));
      setTotal(res.total);
      setPagina(p);
    } catch {
      // El panel muestra lo que ya tenía.
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (usuarioId) void refrescarContador();
  }, [usuarioId, refrescarContador]);

  useRealtimeEvent("notificacion:nueva", ({ tipo }) => {
    void refrescarContador();
    // El plan cambió con la sesión abierta (bajó a gratuito por mora):
    // refrescar la sesión para recalcular la navegación con candados.
    if (tipo === "PLAN_DEGRADADO") void refrescarUsuario();
    if (abierto) void cargarPagina(1);
  });

  function onOpenChange(open: boolean) {
    setAbierto(open);
    if (open) void cargarPagina(1);
  }

  async function abrirNotificacion(n: Notificacion) {
    if (n.leidaEn === null) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leidaEn: new Date().toISOString() } : x)));
      apiFetch<{ total: number }>(`/notificaciones/${n.id}/leer`, { method: "POST" })
        .then(({ total }) => setNoLeidas(total))
        .catch(() => {});
    }
    if (n.url) {
      setAbierto(false);
      router.push(n.url);
    }
  }

  async function marcarTodas() {
    try {
      await apiFetch("/notificaciones/leer-todas", { method: "POST" });
      setNoLeidas(0);
      const ahora = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.leidaEn ? x : { ...x, leidaEn: ahora })));
    } catch {
      // Sin cambios si falla.
    }
  }

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
        >
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 border-b border-border px-5 pb-3 pt-6">
          <SheetHeader>
            <SheetTitle>Notificaciones</SheetTitle>
          </SheetHeader>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Link
              href="/notificaciones"
              onClick={() => setAbierto(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver todas
            </Link>
            {noLeidas > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={marcarTodas}>
                <CheckCheck aria-hidden />
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {cargando && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>
          ) : (
            <>
              <ul className="space-y-1">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificacionItem notificacion={n} onClick={() => abrirNotificacion(n)} />
                  </li>
                ))}
              </ul>
              {items.length < total && (
                <div className="flex justify-center p-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => cargarPagina(pagina + 1)} disabled={cargando}>
                    {cargando ? <Loader2 className="animate-spin" /> : "Ver más"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
