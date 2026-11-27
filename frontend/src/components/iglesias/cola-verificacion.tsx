"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { ApiError, apiFetch } from "@/lib/api";
import { IglesiaLogo } from "./iglesia-logo";
import type { IglesiaListItem } from "./types";

/**
 * "Iglesias por verificar": altas de autoservicio sin verificar
 * (`GET /iglesias?verificada=false&origen=AUTOSERVICIO`). Se refresca con el
 * evento realtime `iglesia:registrada`.
 */
export function ColaVerificacion() {
  const [items, setItems] = useState<IglesiaListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await apiFetch<IglesiaListItem[]>("/iglesias?verificada=false&origen=AUTOSERVICIO"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la cola de verificación");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useRealtimeEvent("iglesia:registrada", () => {
    void cargar();
  });

  async function verificar(iglesia: IglesiaListItem) {
    setEnCurso(iglesia.id);
    try {
      await apiFetch(`/iglesias/${iglesia.id}/verificacion`, {
        method: "PATCH",
        body: JSON.stringify({ verificada: true }),
      });
      setItems((prev) => prev?.filter((i) => i.id !== iglesia.id) ?? prev);
      toast(`${iglesia.nombre} quedó verificada.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo verificar la iglesia");
    } finally {
      setEnCurso(null);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 p-6 pb-4">
        <h2 className="text-sm font-medium text-foreground">
          Iglesias por verificar{items ? ` (${items.length})` : ""}
        </h2>
        <Link
          href="/superadmin/iglesias?verificada=false&origen=AUTOSERVICIO"
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Ver en el listado
        </Link>
      </div>
      {error ? (
        <p className="px-6 pb-6 text-sm text-destructive">{error}</p>
      ) : !items ? (
        <div className="flex items-center gap-2 px-6 pb-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : items.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No hay iglesias pendientes de verificación.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((iglesia) => (
            <li key={iglesia.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
              <IglesiaLogo logoUrl={iglesia.logoUrl} nombre={iglesia.nombre} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{iglesia.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {iglesia.comuna}, {iglesia.region}
                  {iglesia.pastor ? ` · ${iglesia.pastor.nombre} ${iglesia.pastor.apellido} (${iglesia.pastor.email})` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/superadmin/iglesias/${iglesia.id}`}>Ver detalle</Link>
                </Button>
                <Button type="button" size="sm" onClick={() => verificar(iglesia)} disabled={enCurso !== null}>
                  {enCurso === iglesia.id ? <Loader2 className="animate-spin" /> : "Verificar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
