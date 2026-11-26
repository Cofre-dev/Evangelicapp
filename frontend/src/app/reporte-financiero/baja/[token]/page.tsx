"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Building2, CheckCircle2, Church, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { SuscripcionReporte } from "@/components/finanzas/reporte-congregacion/types";
import { ApiError, apiFetch } from "@/lib/api";

// Destino del link "Dejar de recibirlo" de cada correo del reporte financiero
// mensual. Pública (sin sesión). Nunca da de baja al abrir la página: los
// filtros antispam abren solos los links de los correos, así que la baja
// siempre exige un clic explícito (POST).

type Estado = "cargando" | "error" | "listo";

function mensajeError(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return "Demasiados intentos, prueba de nuevo en un minuto.";
  if (err instanceof ApiError && err.status === 404) return "Este enlace no es válido o ya no existe.";
  return err instanceof ApiError ? err.message : "No se pudo completar la acción. Prueba de nuevo.";
}

export default function BajaReporteFinancieroPage() {
  const params = useParams<{ token: string }>();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState<string | null>(null);
  const [suscripcion, setSuscripcion] = useState<SuscripcionReporte | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!params.token) return;
    apiFetch<SuscripcionReporte>(`/reporte-financiero/suscripcion/${params.token}`)
      .then((data) => {
        setSuscripcion(data);
        setEstado("listo");
      })
      .catch((err) => {
        setError(mensajeError(err));
        setEstado("error");
      });
  }, [params.token]);

  async function cambiar(accion: "baja" | "reactivar") {
    if (!params.token) return;
    setEnviando(true);
    try {
      const data = await apiFetch<SuscripcionReporte>(`/reporte-financiero/suscripcion/${params.token}/${accion}`, {
        method: "POST",
      });
      setSuscripcion(data);
      if (accion === "reactivar") toast("Te volviste a suscribir");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(mensajeError(err));
        setEstado("error");
      } else {
        toast.error(mensajeError(err));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div aria-hidden className="h-1.5 bg-[linear-gradient(90deg,hsl(199_70%_52%),hsl(203_66%_42%))]" />
        <div className="p-8">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Church className="h-3.5 w-3.5" />
            </div>
            <p className="font-display text-base italic text-primary">Evangelicapp</p>
          </div>

          {estado === "cargando" && (
            <div className="flex flex-col items-center gap-3 py-2" aria-busy="true" aria-label="Cargando">
              <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-56 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
          )}

          {estado === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {estado === "listo" && suscripcion && (
            <div className="flex flex-col items-center gap-3 text-center">
              {suscripcion.logoUrl ? (
                <Image
                  src={suscripcion.logoUrl}
                  alt={`Logo de ${suscripcion.nombreIglesia}`}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border border-border object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <p className="text-sm font-medium text-foreground">{suscripcion.nombreIglesia}</p>

              {suscripcion.suscrito ? (
                <>
                  <h1 className="mt-2 text-lg font-semibold text-foreground">
                    ¿Dejar de recibir el reporte financiero?
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Ya no recibirás por correo el reporte financiero mensual de{" "}
                    <strong className="text-foreground">{suscripcion.nombreIglesia}</strong>.
                  </p>
                  <Button
                    variant="destructive"
                    className="mt-2 w-full"
                    disabled={enviando}
                    onClick={() => cambiar("baja")}
                  >
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, dejar de recibirlo"}
                  </Button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mt-2 h-10 w-10 text-emerald-600" aria-hidden />
                  <h1 className="text-lg font-semibold text-foreground">Listo, ya no recibirás el reporte</h1>
                  <p className="text-sm text-muted-foreground">Si fue un error, puedes volver a suscribirte.</p>
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    disabled={enviando}
                    onClick={() => cambiar("reactivar")}
                  >
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Volver a suscribirme"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
