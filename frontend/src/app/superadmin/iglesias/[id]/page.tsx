"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FACTURACION_COLOR_CLASSES,
  PLAN_BADGE_CLASSES,
  PLAN_LABEL,
  type EstadoFacturacion,
  type LimitesIglesia,
  type PlanIglesia,
} from "@/components/iglesias/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { API_URL, ApiError, apiFetch } from "@/lib/api";

interface MiembroEquipo {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "USUARIO";
  activo: boolean;
  createdAt: string;
}

interface IglesiaDetalle {
  id: string;
  nombre: string;
  comuna: string;
  region: string;
  direccion: string | null;
  logoUrl: string | null;
  estado: "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
  visitantesPromedio: number | null;
  createdAt: string;
  ultimoPagoAt: string | null;
  plan: PlanIglesia;
  facturacion: EstadoFacturacion;
  limites: LimitesIglesia;
  // Este endpoint (`/iglesias/:id`, exclusivo de SUPER_ADMIN) no está
  // mencionado explícitamente en el brief de `frontend/prompt.md`. Se deja el
  // nombre del campo (`pastor`) sin tocar por no tener confirmación de que
  // haya cambiado, pero el valor literal de `rol` sí se actualiza a `MANAGER`
  // porque ese es un enum global del backend y "PASTOR" ya no existe en él —
  // dejarlo en "PASTOR" garantizaría un mismatch de tipos contra la respuesta
  // real. Señalado para confirmar con backend en vez de asumido en silencio.
  pastor: (Omit<MiembroEquipo, "rol"> & { rol: "MANAGER" }) | null;
  equipo: MiembroEquipo[];
}

const ROL_LABEL: Record<MiembroEquipo["rol"], string> = {
  USUARIO: "Usuario",
};

const ESTADO_LABEL: Record<IglesiaDetalle["estado"], string> = {
  ACTIVA: "Activa",
  SUSPENDIDA: "Suspendida",
  INACTIVA: "Inactiva",
};

function PersonaRow({ nombre, apellido, cargo, email }: { nombre: string; apellido: string; cargo: string; email: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
      <div>
        <p className="text-base font-semibold text-foreground">
          {nombre} {apellido}
        </p>
        <p className="text-xs text-muted-foreground">{cargo}</p>
      </div>
      <p className="text-sm text-muted-foreground">{email}</p>
    </div>
  );
}

export default function IglesiaDetallePage() {
  const params = useParams<{ id: string }>();
  const { usuario, ready } = useRequireAuth();

  const [data, setData] = useState<IglesiaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [planSeleccionado, setPlanSeleccionado] = useState<PlanIglesia>("BASICO");
  const [fechaFacturacion, setFechaFacturacion] = useState("");
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario || !params.id) return;

    apiFetch<IglesiaDetalle>(`/iglesias/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la iglesia"))
      .finally(() => setLoading(false));
  }, [usuario, params.id]);

  // Sincroniza los campos editables cada vez que llega un `data` nuevo (carga
  // inicial o refresco tras una acción) — antes de eso reflejan lo último
  // guardado en el backend.
  useEffect(() => {
    if (data) {
      setPlanSeleccionado(data.plan);
      setFechaFacturacion(data.facturacion.proximaFacturacion.slice(0, 10));
    }
  }, [data]);

  async function ejecutarAccion(accion: string, path: string, options?: RequestInit) {
    if (!data) return;
    setAccionEnCurso(accion);
    setAccionError(null);
    try {
      const actualizado = await apiFetch<IglesiaDetalle>(`/iglesias/${data.id}${path}`, options);
      setData(actualizado);
    } catch (err) {
      setAccionError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setAccionEnCurso(null);
    }
  }

  function cambiarPlan() {
    ejecutarAccion("plan", "/plan", { method: "PATCH", body: JSON.stringify({ plan: planSeleccionado }) });
  }

  function guardarFechaFacturacion() {
    if (!fechaFacturacion) return;
    ejecutarAccion("fecha", "/facturacion", {
      method: "PATCH",
      body: JSON.stringify({ proximaFacturacion: fechaFacturacion }),
    });
  }

  function marcarPagada() {
    ejecutarAccion("pagada", "/marcar-pagada", { method: "POST" });
  }

  function ocultarIglesia() {
    ejecutarAccion("ocultar", "/ocultar", { method: "PATCH" });
  }

  function mostrarIglesia() {
    ejecutarAccion("mostrar", "/mostrar", { method: "PATCH" });
  }

  if (!ready || !usuario) {
    return null;
  }

  if (usuario.rol !== "SUPER_ADMIN") {
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
    <main className="h-full bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/superadmin"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando iglesia...
          </div>
        ) : data ? (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start gap-4">
                {data.logoUrl ? (
                  <Image
                    src={`${API_URL}${data.logoUrl}`}
                    alt={`Logo de ${data.nombre}`}
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-foreground">{data.nombre}</h1>
                    <span
                      className={
                        data.estado === "ACTIVA"
                          ? "rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {ESTADO_LABEL[data.estado]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_CLASSES[data.plan]}`}>
                      {PLAN_LABEL[data.plan]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.comuna}, {data.region}
                  </p>
                  {data.direccion && <p className="text-sm text-muted-foreground">{data.direccion}</p>}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Creada</p>
                  <p className="text-foreground">{new Date(data.createdAt).toLocaleDateString("es-CL")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Visitantes promedio</p>
                  <p className="text-foreground">{data.visitantesPromedio ?? "—"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-foreground">Facturación</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Último pago: {data.ultimoPagoAt ? new Date(data.ultimoPagoAt).toLocaleDateString("es-CL") : "Nunca"}
                  </p>
                </div>
                <Button type="button" onClick={marcarPagada} disabled={accionEnCurso !== null}>
                  {accionEnCurso === "pagada" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Marcar como pagada"}
                </Button>
              </div>

              {accionError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{accionError}</AlertDescription>
                </Alert>
              )}

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cambiar-plan">Cambiar plan</Label>
                  <div className="flex gap-2">
                    <Select value={planSeleccionado} onValueChange={(value) => setPlanSeleccionado(value as PlanIglesia)}>
                      <SelectTrigger id="cambiar-plan" className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["BASICO", "MEDIO", "PRO"] as const).map((plan) => (
                          <SelectItem key={plan} value={plan}>
                            {PLAN_LABEL[plan]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cambiarPlan}
                      disabled={accionEnCurso !== null || planSeleccionado === data.plan}
                    >
                      {accionEnCurso === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editar-fecha">Corregir fecha de facturación</Label>
                  <div className="flex gap-2">
                    <Input
                      id="editar-fecha"
                      type="date"
                      value={fechaFacturacion}
                      onChange={(e) => setFechaFacturacion(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={guardarFechaFacturacion}
                      disabled={accionEnCurso !== null || !fechaFacturacion}
                    >
                      {accionEnCurso === "fecha" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-4">
                {data.estado === "SUSPENDIDA" ? (
                  <Button type="button" variant="outline" onClick={mostrarIglesia} disabled={accionEnCurso !== null}>
                    {accionEnCurso === "mostrar" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mostrar iglesia"}
                  </Button>
                ) : (
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={ocultarIglesia}
                      disabled={accionEnCurso !== null || !data.facturacion.puedeOcultar}
                      title={!data.facturacion.puedeOcultar ? "Disponible cuando la mora supere los 3 días" : undefined}
                    >
                      {accionEnCurso === "ocultar" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ocultar iglesia"}
                    </Button>
                    {!data.facturacion.puedeOcultar && (
                      <p className="text-xs text-muted-foreground">Disponible cuando la mora supere los 3 días.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                  <p className="text-foreground">
                    {data.limites.usuarios.actuales} / {data.limites.usuarios.maximo}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subdepartamentos de finanzas</p>
                  <p className="text-foreground">
                    {data.limites.departamentosFinancieros.actuales} / {data.limites.departamentosFinancieros.maximo}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-medium text-foreground">Pastor a cargo</h2>
              <div className="mt-3">
                {data.pastor ? (
                  <PersonaRow
                    nombre={data.pastor.nombre}
                    apellido={data.pastor.apellido}
                    cargo={`Pastor · @${data.pastor.username}`}
                    email={data.pastor.email}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sin pastor asignado.</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-medium text-foreground">Equipo</h2>
              <div className="mt-3 space-y-2">
                {data.equipo.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Esta iglesia todavía no tiene equipo agregado.</p>
                ) : (
                  data.equipo.map((miembro) => (
                    <PersonaRow
                      key={miembro.id}
                      nombre={miembro.nombre}
                      apellido={miembro.apellido}
                      cargo={`${ROL_LABEL[miembro.rol]} · @${miembro.username}${miembro.activo ? "" : " · Inactivo"}`}
                      email={miembro.email}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
