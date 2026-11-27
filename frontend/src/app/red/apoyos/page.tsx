"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import { ConfirmarDialog } from "@/components/red/confirmar-dialog";
import { formatFecha } from "@/components/red/format";
import { EstadoLlamadoBadge } from "@/components/red/llamado-card";
import { puedeEscribirRed } from "@/components/red/permisos";
import type { MiCompromiso } from "@/components/red/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";

export default function MisApoyosPage() {
  const { usuario } = useRequireAuth();
  const [items, setItems] = useState<MiCompromiso[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [porCancelar, setPorCancelar] = useState<MiCompromiso | null>(null);

  const escribe = puedeEscribirRed(usuario);

  const cargar = useCallback(async () => {
    try {
      setItems(await apiFetch<MiCompromiso[]>("/red/mis-compromisos"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus apoyos");
    }
  }, []);

  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario, cargar]);

  async function cancelar(c: MiCompromiso) {
    try {
      await apiFetch(`/red/compromisos/${c.id}`, { method: "DELETE" });
      setItems((prev) => prev?.filter((i) => i.id !== c.id) ?? prev);
      toast("Cancelaste tu apoyo.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cancelar el apoyo");
      throw err;
    }
  }

  if (!usuario) return null;

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Mis apoyos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Los compromisos activos de tu iglesia con llamados de otras iglesias.</p>

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
      ) : items && items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Tu iglesia aún no se ha comprometido con ningún llamado.</p>
          <Button asChild variant="link" className="mt-1">
            <Link href="/red">Ver llamados en el feed</Link>
          </Button>
        </div>
      ) : items ? (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {items.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <IglesiaLogo
                  logoUrl={c.llamado.iglesia?.logoUrl ?? null}
                  nombre={c.llamado.iglesia?.nombre ?? ""}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/red/llamados/${c.llamado.id}`}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {c.llamado.titulo}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.llamado.iglesia?.nombre ?? "Iglesia"} · {c.llamado.comuna}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.necesidad ? c.necesidad.descripcion : "Apoyo general"}
                    {c.cantidad != null &&
                      ` · ${c.cantidad.toLocaleString("es-CL")}${c.necesidad?.unidad ? ` ${c.necesidad.unidad}` : ""}`}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <EstadoLlamadoBadge estado={c.llamado.estado} />
                    {c.llamado.fechaInicio && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {formatFecha(c.llamado.fechaInicio)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {escribe && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="self-end text-destructive hover:text-destructive sm:self-auto"
                  onClick={() => setPorCancelar(c)}
                >
                  Cancelar apoyo
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmarDialog
        open={porCancelar !== null}
        onOpenChange={(o) => !o && setPorCancelar(null)}
        titulo="¿Cancelar tu apoyo?"
        descripcion="La iglesia autora recibirá un aviso de que ya no apoyas esta necesidad."
        confirmarLabel="Cancelar apoyo"
        destructivo
        onConfirmar={async () => {
          if (porCancelar) await cancelar(porCancelar);
        }}
      />
    </div>
  );
}
