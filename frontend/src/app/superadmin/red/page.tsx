"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { formatFechaHora } from "@/components/red/format";
import { EstadoLlamadoBadge } from "@/components/red/llamado-card";
import type { ReporteModeracion } from "@/components/red/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";

/** Moderación de la Red de iglesias (solo SUPER_ADMIN): reportes de llamados. */
export default function ModeracionRedPage() {
  const { usuario, ready } = useRequireAuth();
  const [verRevisados, setVerRevisados] = useState(false);
  const [reportes, setReportes] = useState<ReporteModeracion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const esSuperAdmin = usuario?.rol === "SUPER_ADMIN";

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setReportes(
        await apiFetch<ReporteModeracion[]>(`/red/moderacion/reportes?pendientes=${verRevisados ? "false" : "true"}`),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los reportes");
    }
  }, [verRevisados]);

  useEffect(() => {
    if (ready && esSuperAdmin) {
      setReportes(null);
      void cargar();
    }
  }, [ready, esSuperAdmin, cargar]);

  async function accion(clave: string, path: string, body: unknown, ok: string) {
    setEnCurso(clave);
    try {
      await apiFetch(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
      toast(ok);
      await cargar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setEnCurso(null);
    }
  }

  if (!ready || !usuario) return null;

  if (!esSuperAdmin) {
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
    <main className="h-full bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Moderación de la red</h1>
            <p className="mt-1 text-sm text-muted-foreground">Llamados de ayuda reportados por las iglesias.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={verRevisados} onCheckedChange={setVerRevisados} aria-label="Ver también revisados" />
            Ver también revisados
          </label>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!reportes && !error ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando…
          </div>
        ) : reportes && reportes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {verRevisados ? "No hay reportes." : "No hay reportes pendientes."}
            </p>
          </div>
        ) : reportes ? (
          <ul className="mt-6 space-y-4">
            {reportes.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{r.llamado.titulo}</h2>
                  <EstadoLlamadoBadge estado={r.llamado.estado} />
                  {r.llamado.ocultoModeracion && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <EyeOff className="h-3.5 w-3.5" aria-hidden />
                      Oculto
                    </span>
                  )}
                  {r.revisadoEn && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Revisado
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Publicado por{" "}
                  <Link href={`/superadmin/iglesias/${r.llamado.iglesia.id}`} className="font-medium hover:underline">
                    {r.llamado.iglesia.nombre}
                  </Link>{" "}
                  · {r.llamado.iglesia.comuna}, {r.llamado.iglesia.region} · {formatFechaHora(r.llamado.createdAt)}
                </p>
                <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-foreground">{r.llamado.descripcion}</p>

                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm">
                  <p className="text-xs font-medium text-amber-800">
                    Reportado por {r.iglesia.nombre} · {formatFechaHora(r.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-amber-900">{r.motivo}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {r.llamado.ocultoModeracion ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={enCurso !== null}
                      onClick={() =>
                        accion(`mostrar-${r.id}`, `/red/moderacion/llamados/${r.llamado.id}`, { oculto: false }, "El llamado vuelve a estar visible.")
                      }
                    >
                      {enCurso === `mostrar-${r.id}` ? <Loader2 className="animate-spin" /> : <Eye aria-hidden />}
                      Volver a mostrar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={enCurso !== null}
                      onClick={() =>
                        accion(`ocultar-${r.id}`, `/red/moderacion/llamados/${r.llamado.id}`, { oculto: true }, "Llamado ocultado.")
                      }
                    >
                      {enCurso === `ocultar-${r.id}` ? <Loader2 className="animate-spin" /> : <EyeOff aria-hidden />}
                      Ocultar llamado
                    </Button>
                  )}
                  {!r.revisadoEn && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={enCurso !== null}
                      onClick={() =>
                        accion(`descartar-${r.id}`, `/red/moderacion/reportes/${r.id}/revisado`, undefined, "Reporte descartado.")
                      }
                    >
                      {enCurso === `descartar-${r.id}` ? <Loader2 className="animate-spin" /> : "Descartar reporte"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
