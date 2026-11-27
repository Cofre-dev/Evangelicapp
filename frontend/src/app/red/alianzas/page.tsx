"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import { ConfirmarDialog } from "@/components/red/confirmar-dialog";
import { formatRelativo } from "@/components/red/format";
import { puedeEscribirRed } from "@/components/red/permisos";
import type { AlianzaItem } from "@/components/red/types";
import { VerificadaBadge } from "@/components/red/verificada-badge";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRedStore } from "@/stores/red-store";

type Pestaña = "recibidas" | "enviadas" | "aliadas";

const VACIO: Record<Pestaña, string> = {
  recibidas: "No tienes solicitudes de alianza pendientes.",
  enviadas: "No tienes solicitudes enviadas pendientes.",
  aliadas: "Tu iglesia aún no tiene aliadas.",
};

export default function AlianzasPage() {
  const { usuario } = useRequireAuth();
  const cargarResumen = useRedStore((s) => s.cargarAlianzas);

  const [items, setItems] = useState<AlianzaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestaña, setPestaña] = useState<Pestaña>("recibidas");
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [porTerminar, setPorTerminar] = useState<AlianzaItem | null>(null);

  const escribe = puedeEscribirRed(usuario);

  const cargar = useCallback(async () => {
    try {
      setItems(await apiFetch<AlianzaItem[]>("/red/alianzas"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar las alianzas");
    }
  }, []);

  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario, cargar]);

  useRealtimeEvent("notificacion:nueva", ({ tipo }) => {
    if (tipo === "ALIANZA_SOLICITADA" || tipo === "ALIANZA_ACEPTADA") void cargar();
  });

  async function responder(a: AlianzaItem, aceptar: boolean) {
    setEnCurso(a.id);
    try {
      await apiFetch(`/red/alianzas/${a.id}/responder`, { method: "POST", body: JSON.stringify({ aceptar }) });
      toast(aceptar ? `Ahora ${a.iglesia?.nombre ?? "la iglesia"} es una iglesia aliada.` : "Solicitud rechazada.");
      await cargar();
      void cargarResumen();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo responder la solicitud");
    } finally {
      setEnCurso(null);
    }
  }

  async function eliminar(a: AlianzaItem, mensajeOk: string) {
    setEnCurso(a.id);
    try {
      await apiFetch(`/red/alianzas/${a.id}`, { method: "DELETE" });
      toast(mensajeOk);
      await cargar();
      void cargarResumen();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo completar la acción");
      throw err;
    } finally {
      setEnCurso(null);
    }
  }

  if (!usuario) return null;

  const recibidas = items?.filter((a) => a.estado === "PENDIENTE" && a.direccion === "RECIBIDA") ?? [];
  const enviadas = items?.filter((a) => a.estado === "PENDIENTE" && a.direccion === "ENVIADA") ?? [];
  const aliadas = items?.filter((a) => a.estado === "ACEPTADA") ?? [];
  const lista = pestaña === "recibidas" ? recibidas : pestaña === "enviadas" ? enviadas : aliadas;

  const PESTAÑAS: { id: Pestaña; label: string; n: number }[] = [
    { id: "recibidas", label: "Solicitudes recibidas", n: recibidas.length },
    { id: "enviadas", label: "Enviadas", n: enviadas.length },
    { id: "aliadas", label: "Aliadas", n: aliadas.length },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Alianzas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Las iglesias aliadas ven los llamados &ldquo;Solo aliadas&rdquo; de la otra.{" "}
        <Link href="/red/iglesias" className="font-medium text-primary hover:underline">
          Buscar iglesias
        </Link>
      </p>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Alianzas" className="inline-flex min-w-max gap-1 rounded-lg bg-muted p-1">
          {PESTAÑAS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={pestaña === p.id}
              onClick={() => setPestaña(p.id)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pestaña === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
              {p.n > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    p.id === "recibidas"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-background text-muted-foreground",
                  )}
                >
                  {p.n}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!items && !error ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : lista.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">{VACIO[pestaña]}</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {lista.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <IglesiaLogo logoUrl={a.iglesia?.logoUrl ?? null} nombre={a.iglesia?.nombre ?? ""} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.iglesia ? (
                      <Link
                        href={`/red/iglesias/${a.iglesia.iglesiaId}`}
                        className="text-sm font-medium text-foreground hover:underline"
                      >
                        {a.iglesia.nombre}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-foreground">Iglesia</p>
                    )}
                    {a.iglesia && <VerificadaBadge verificada={a.iglesia.verificada} />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.iglesia ? `${a.iglesia.comuna}, ${a.iglesia.region} · ` : ""}
                    {pestaña === "aliadas" && a.respondidaEn
                      ? `Aliadas ${formatRelativo(a.respondidaEn)}`
                      : formatRelativo(a.createdAt)}
                  </p>
                  {a.mensaje && <p className="mt-1 text-sm text-foreground">&ldquo;{a.mensaje}&rdquo;</p>}
                </div>
              </div>
              {escribe && (
                <div className="flex flex-wrap gap-2 self-end sm:self-auto">
                  {pestaña === "recibidas" && (
                    <>
                      <Button type="button" size="sm" onClick={() => responder(a, true)} disabled={enCurso !== null}>
                        {enCurso === a.id ? <Loader2 className="animate-spin" /> : <Check aria-hidden />}
                        Aceptar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => responder(a, false)}
                        disabled={enCurso !== null}
                      >
                        <X aria-hidden />
                        Rechazar
                      </Button>
                    </>
                  )}
                  {pestaña === "enviadas" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => eliminar(a, "Solicitud retirada.").catch(() => {})}
                      disabled={enCurso !== null}
                    >
                      {enCurso === a.id ? <Loader2 className="animate-spin" /> : "Retirar"}
                    </Button>
                  )}
                  {pestaña === "aliadas" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPorTerminar(a)}
                      disabled={enCurso !== null}
                    >
                      Terminar alianza
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmarDialog
        open={porTerminar !== null}
        onOpenChange={(o) => !o && setPorTerminar(null)}
        titulo="¿Terminar la alianza?"
        descripcion={`Dejarán de ver los llamados "Solo aliadas" de ${porTerminar?.iglesia?.nombre ?? "esa iglesia"} y ella los de tu iglesia.`}
        confirmarLabel="Terminar alianza"
        destructivo
        onConfirmar={async () => {
          if (porTerminar) await eliminar(porTerminar, "Alianza terminada.");
        }}
      />
    </div>
  );
}
