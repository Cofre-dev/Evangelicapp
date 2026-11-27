"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONTACTO_EMAIL,
  FACTURACION_COLOR_CLASSES,
  PLAN_BADGE_CLASSES,
  PLAN_LABEL,
  PLAN_LIMITES,
  PLANES_PAGO,
  type PlanPago,
} from "@/components/iglesias/types";
import type { FacturacionResponse } from "@/components/facturacion/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";

// Sin pasarela de pago: los pagos se confirman manualmente por el SuperAdmin
// (ver frontend/prompt.md) — esta pantalla es 100% informativa, sin acciones.

const MODULOS_PAGO = ["Agenda", "Finanzas", "Ceremonias", "Integrantes", "Notas", "Equipo y accesos", "Red de iglesias"];

function Cupo({ label, actuales, maximo }: { label: string; actuales: number; maximo: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular-nums text-foreground">
        {actuales} / {maximo}
      </p>
    </div>
  );
}

function mailto(asunto: string) {
  return `mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(asunto)}`;
}

/** Tarjetas comparativas de los planes de pago (sin precios: el modelo de
 * precios todavía no está definido, ver HistorialPagoItem). */
function PlanesDePago({ nombreIglesia, planActual }: { nombreIglesia: string; planActual: PlanPago | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PLANES_PAGO.map((plan) => {
        const limites = PLAN_LIMITES[plan];
        const esActual = plan === planActual;
        return (
          <div
            key={plan}
            className={`flex flex-col rounded-2xl border bg-card p-5 shadow-sm ${esActual ? "border-primary" : "border-border"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[plan]}`}>
                {PLAN_LABEL[plan]}
              </span>
              {esActual && <span className="text-xs font-medium text-primary">Tu plan</span>}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                Hasta {limites.usuarios} usuarios
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {limites.departamentos > 0
                  ? `${limites.departamentos} subdepartamentos de finanzas`
                  : "Finanzas sin subdepartamentos"}
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {MODULOS_PAGO.join(", ")}
              </li>
            </ul>
            {!esActual && (
              <Button asChild variant="outline" size="sm" className="mt-5">
                <a href={mailto(`Quiero contratar el plan ${PLAN_LABEL[plan]} — ${nombreIglesia}`)}>Contactar</a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FacturacionPage() {
  const { usuario, ready } = useRequireAuth();

  const [data, setData] = useState<FacturacionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<FacturacionResponse>("/mi-iglesia/facturacion");
      setData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la facturación");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (usuario?.rol === "MANAGER") {
      cargar();
    }
  }, [usuario, cargar]);

  if (!ready || !usuario) {
    return null;
  }

  if (usuario.rol !== "MANAGER") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para ver esta página.</p>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </main>
    );
  }

  const asuntoPago = data ? `Confirmación de pago — ${data.nombre}` : "";
  const asuntoUpgrade = data ? `Solicitud de upgrade de plan — ${data.nombre}` : "";
  const llamados = data?.limites.llamadosAbiertos;

  return (
    <main className="h-full bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Facturación</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan, uso y próxima fecha de facturación de tu iglesia.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : data && data.facturacion === null ? (
          // Plan GRATUITO: sin semáforo ni fecha de cobro.
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Plan <span className="font-semibold">Gratuito</span>: Red de iglesias
                </CardTitle>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES.GRATUITO}`}>
                  {PLAN_LABEL.GRATUITO}
                </span>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <Cupo label="Usuarios" actuales={data.limites.usuarios.actuales} maximo={data.limites.usuarios.maximo} />
                {llamados && <Cupo label="Llamados de ayuda abiertos" actuales={llamados.actuales} maximo={llamados.maximo} />}
              </CardContent>
            </Card>

            {data.planPrevioMora && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertDescription>
                  Tu iglesia pasó al plan gratuito por una mensualidad pendiente. Al confirmarse tu pago recuperas el
                  plan {PLAN_LABEL[data.planPrevioMora]} con todos tus datos. Si ya pagaste, escribe a{" "}
                  <a href={mailto(asuntoPago)} className="font-medium underline">
                    {CONTACTO_EMAIL}
                  </a>{" "}
                  con el asunto &ldquo;{asuntoPago}&rdquo;.
                </AlertDescription>
              </Alert>
            )}

            <div>
              <h2 className="text-sm font-medium text-foreground">Planes de pago</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Desbloquean agenda, finanzas, ceremonias, integrantes y el resto de la plataforma.
              </p>
              <div className="mt-4">
                <PlanesDePago nombreIglesia={data.nombre} planActual={null} />
              </div>
            </div>
          </>
        ) : data && data.facturacion ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Plan actual</CardTitle>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[data.plan]}`}>
                  {PLAN_LABEL[data.plan]}
                </span>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                <Cupo label="Usuarios" actuales={data.limites.usuarios.actuales} maximo={data.limites.usuarios.maximo} />
                <div>
                  <p className="text-xs text-muted-foreground">Subdepartamentos de finanzas</p>
                  <p className="text-foreground">
                    {PLAN_LIMITES[data.plan].departamentos > 0
                      ? `${data.limites.departamentosFinancieros.actuales} / ${data.limites.departamentosFinancieros.maximo}`
                      : "Sin acceso en tu plan"}
                  </p>
                </div>
                {llamados && <Cupo label="Llamados de ayuda abiertos" actuales={llamados.actuales} maximo={llamados.maximo} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próxima facturación</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${FACTURACION_COLOR_CLASSES[data.facturacion.color]}`}
                >
                  {new Date(data.facturacion.proximaFacturacion).toLocaleDateString("es-CL")}
                </span>
                <p className="text-sm text-muted-foreground">
                  {data.facturacion.enMora
                    ? `Vencida hace ${data.facturacion.diasEnMora} día${data.facturacion.diasEnMora === 1 ? "" : "s"}`
                    : `Faltan ${data.facturacion.diasParaFacturacion} día${data.facturacion.diasParaFacturacion === 1 ? "" : "s"}`}
                </p>
              </CardContent>
            </Card>

            {data.facturacion.enMora && (
              <Alert variant="destructive">
                <AlertDescription>
                  Si pasas 3 días sin pagar, tu iglesia pasa al plan gratuito: conservas tus datos, pero solo tendrás
                  acceso a la Red de iglesias hasta ponerte al día.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
                <p>
                  Si ya pagaste tu mensualidad, pero te aparece que no, manda un correo a{" "}
                  <a href={mailto(asuntoPago)} className="text-primary underline">
                    {CONTACTO_EMAIL}
                  </a>{" "}
                  con el asunto &ldquo;{asuntoPago}&rdquo;.
                </p>
                {data.plan !== "PRO" && (
                  <p>
                    Si quieres subir de plan, manda un correo a{" "}
                    <a href={mailto(asuntoUpgrade)} className="text-primary underline">
                      {CONTACTO_EMAIL}
                    </a>{" "}
                    con el asunto &ldquo;{asuntoUpgrade}&rdquo;.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
