"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ConfirmarDialog } from "@/components/red/confirmar-dialog";
import { LlamadoCard } from "@/components/red/llamado-card";
import { puedeEscribirRed } from "@/components/red/permisos";
import type { EstadoLlamado, LlamadoDetalle } from "@/components/red/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { ApiError, apiFetch } from "@/lib/api";
import { useRedStore } from "@/stores/red-store";

export default function MisLlamadosPage() {
  const { usuario } = useRequireAuth();
  const cupo = useRedStore((s) => s.llamadosAbiertos);
  const cargarLimites = useRedStore((s) => s.cargarLimites);

  const [llamados, setLlamados] = useState<LlamadoDetalle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitePlan, setLimitePlan] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [porCerrar, setPorCerrar] = useState<LlamadoDetalle | null>(null);

  const escribe = puedeEscribirRed(usuario);

  const cargar = useCallback(async () => {
    try {
      setLlamados(await apiFetch<LlamadoDetalle[]>("/red/mis-llamados"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus llamados");
    }
  }, []);

  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario, cargar]);

  useRealtimeEvent("red:llamado-actualizado", ({ llamadoId }) => {
    if (llamados?.some((l) => l.id === llamadoId)) void cargar();
  });

  async function cambiarEstado(llamado: LlamadoDetalle, estado: EstadoLlamado) {
    setEnCurso(llamado.id);
    setLimitePlan(null);
    try {
      const actualizado = await apiFetch<LlamadoDetalle>(`/red/llamados/${llamado.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setLlamados((prev) => prev?.map((l) => (l.id === actualizado.id ? actualizado : l)) ?? prev);
      void cargarLimites();
      toast(estado === "CERRADO" ? "Llamado cerrado." : "Llamado reabierto.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "LIMITE_PLAN") setLimitePlan(err.message);
      else toast.error(err instanceof ApiError ? err.message : "No se pudo cambiar el estado");
      throw err;
    } finally {
      setEnCurso(null);
    }
  }

  if (!usuario) return null;

  const activos = llamados?.filter((l) => l.estado !== "CERRADO") ?? [];
  const cerrados = llamados?.filter((l) => l.estado === "CERRADO") ?? [];

  function acciones(llamado: LlamadoDetalle) {
    if (!escribe) return null;
    if (llamado.estado === "CERRADO") {
      return (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => cambiarEstado(llamado, "ABIERTO").catch(() => {})}
          disabled={enCurso !== null}
        >
          {enCurso === llamado.id ? <Loader2 className="animate-spin" /> : "Reabrir"}
        </Button>
      );
    }
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setPorCerrar(llamado)}
        disabled={enCurso !== null}
      >
        Cerrar
      </Button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mis llamados</h1>
          {cupo && (
            <p className="mt-1 text-sm text-muted-foreground">
              Llamados abiertos:{" "}
              <span className="font-medium tabular-nums text-foreground">
                {cupo.actuales}/{cupo.maximo}
              </span>{" "}
              de tu plan
            </p>
          )}
        </div>
        {escribe && (!cupo || cupo.actuales < cupo.maximo) && (
          <Button asChild>
            <Link href="/red/llamados/nuevo">
              <Plus aria-hidden />
              Publicar llamado
            </Link>
          </Button>
        )}
      </div>

      {limitePlan && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>
            {limitePlan}{" "}
            <Link href="/facturacion" className="font-medium underline">
              Ver planes
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!llamados && !error ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : llamados && llamados.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Tu iglesia aún no ha publicado llamados de ayuda.</p>
        </div>
      ) : llamados ? (
        <>
          <section className="mt-6">
            <h2 className="text-sm font-medium text-foreground">Activos ({activos.length})</h2>
            {activos.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No tienes llamados abiertos.</p>
            ) : (
              <div className="mt-3 grid gap-4">
                {activos.map((l) => (
                  <LlamadoCard key={l.id} llamado={l} acciones={acciones(l)} />
                ))}
              </div>
            )}
          </section>
          {cerrados.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-foreground">Cerrados ({cerrados.length})</h2>
              <div className="mt-3 grid gap-4">
                {cerrados.map((l) => (
                  <LlamadoCard key={l.id} llamado={l} acciones={acciones(l)} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}

      <ConfirmarDialog
        open={porCerrar !== null}
        onOpenChange={(o) => !o && setPorCerrar(null)}
        titulo="¿Cerrar el llamado?"
        descripcion="Seguirá visible como cerrado, pero ya no aceptará apoyos. Cerrarlo libera un cupo de tu plan."
        confirmarLabel="Cerrar llamado"
        destructivo
        onConfirmar={async () => {
          if (porCerrar) await cambiarEstado(porCerrar, "CERRADO");
        }}
      />
    </div>
  );
}
