"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, apiFetch } from "@/lib/api";
import { CONTACTO_VENTAS_EMAIL, PLAN_LABEL, type MiIglesiaFacturacion } from "./types";

const COLOR_FACTURACION_CLASS: Record<MiIglesiaFacturacion["facturacion"]["color"], string> = {
  VERDE: "bg-emerald-500",
  AMARILLO: "bg-amber-500",
  ROJO: "bg-red-500",
};

function textoFacturacion(facturacion: MiIglesiaFacturacion["facturacion"]): string {
  if (facturacion.enMora) {
    return `Facturación vencida hace ${facturacion.diasEnMora} día${facturacion.diasEnMora === 1 ? "" : "s"}`;
  }
  if (facturacion.diasParaFacturacion === 0) {
    return "Facturación vence hoy";
  }
  return `Próxima facturación en ${facturacion.diasParaFacturacion} día${facturacion.diasParaFacturacion === 1 ? "" : "s"}`;
}

/** Tarjeta informativa de plan/facturación en "Mi iglesia" (solo MANAGER, ver frontend/prompt.md). */
export function PlanCard() {
  const [datos, setDatos] = useState<MiIglesiaFacturacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MiIglesiaFacturacion>("/mi-iglesia/facturacion")
      .then(setDatos)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar el plan"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Plan</CardTitle>
        {datos && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
            {PLAN_LABEL[datos.plan]}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : datos ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${COLOR_FACTURACION_CLASS[datos.facturacion.color]}`} />
              {textoFacturacion(datos.facturacion)}
            </div>

            <p className="text-sm text-muted-foreground">
              Usuarios: {datos.limites.usuarios.actuales} / {datos.limites.usuarios.maximo}
            </p>

            {datos.plan !== "PRO" && (
              <p className="text-sm text-muted-foreground">
                Si quieres subir de plan, manda un correo a{" "}
                <a href={`mailto:${CONTACTO_VENTAS_EMAIL}?subject=${encodeURIComponent(`Solicitud de upgrade de plan — ${datos.nombre}`)}`} className="text-primary underline">
                  {CONTACTO_VENTAS_EMAIL}
                </a>{" "}
                con el asunto &ldquo;Solicitud de upgrade de plan — {datos.nombre}&rdquo;.
              </p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
