"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HorizontalBars } from "@/components/dashboard/horizontal-bars";
import { StatTile } from "@/components/dashboard/stat-tile";
import { VerticalBars } from "@/components/dashboard/vertical-bars";
import { formatMesCorto } from "@/components/dashboard/format";
import { CambiarFacturacionDialog } from "@/components/iglesias/cambiar-facturacion-dialog";
import { HistorialPagosCard } from "@/components/iglesias/historial-pagos-card";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import {
  FACTURACION_COLOR_CLASSES,
  PLAN_BADGE_CLASSES,
  PLAN_LABEL,
  PLANES_TODOS,
  planLabelConMora,
  type IglesiaDetalle,
  type MiembroEquipo,
  type PlanIglesia,
} from "@/components/iglesias/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";

const CERTIFICADOS_LABEL: Record<keyof IglesiaDetalle["estadisticas"]["certificados"]["porTipo"], string> = {
  matrimonios: "Matrimonios",
  bautizos: "Bautizos",
  defunciones: "Defunciones",
  presentaciones: "Presentaciones",
};

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
  const [confirmFacturacionOpen, setConfirmFacturacionOpen] = useState(false);

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
      setFechaFacturacion(data.facturacion ? data.facturacion.proximaFacturacion.slice(0, 10) : "");
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

  function marcarPagada() {
    ejecutarAccion("pagada", "/marcar-pagada", { method: "POST" });
  }

  function cambiarVerificacion(verificada: boolean) {
    ejecutarAccion("verificacion", "/verificacion", { method: "PATCH", body: JSON.stringify({ verificada }) });
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
          href="/superadmin/iglesias"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Iglesias
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
                <IglesiaLogo logoUrl={data.logoUrl} nombre={data.nombre} size={56} />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
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
                      {planLabelConMora(data.plan, data.planPrevioMora)}
                    </span>
                    {data.verificada ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        Verificada
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Sin verificar
                      </span>
                    )}
                    {data.origen === "AUTOSERVICIO" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Autoservicio
                      </span>
                    )}
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
                <div>
                  <p className="text-xs text-muted-foreground">Origen</p>
                  <p className="text-foreground">{data.origen === "AUTOSERVICIO" ? "Autoservicio" : "Creada por admin"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  {data.verificada
                    ? `Verificada${data.verificadaEn ? ` el ${new Date(data.verificadaEn).toLocaleDateString("es-CL")}` : ""}.`
                    : "Sin verificar: aparece así en el directorio de la Red de iglesias."}
                </p>
                <Button
                  type="button"
                  variant={data.verificada ? "outline" : "default"}
                  size="sm"
                  onClick={() => cambiarVerificacion(!data.verificada)}
                  disabled={accionEnCurso !== null}
                >
                  {accionEnCurso === "verificacion" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : data.verificada ? (
                    "Quitar verificación"
                  ) : (
                    "Verificar"
                  )}
                </Button>
              </div>
            </div>

            {/* ⚠️ Nada financiero acá — el SuperAdmin no ve el detalle
                financiero/operativo interno de una iglesia (regla de negocio
                explícita, ver frontend/prompt.md sección 5). Esta sección solo
                pinta `data.estadisticas`, que el backend garantiza sin montos
                ni movimientos. La card de "Facturación" de abajo es el cobro
                de la plataforma a la iglesia (nivel Evangelicapp), no lo
                mismo que el manejo interno de plata de la propia iglesia —
                separada físicamente de esta sección a propósito para que la
                regla se sostenga por construcción. */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-medium text-foreground">Estadísticas</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatTile label="Activos hoy" value={data.estadisticas.usuariosActivosHoy.toLocaleString("es-CL")} />
                <StatTile
                  label="Activos esta semana"
                  value={data.estadisticas.usuariosActivosSemana.toLocaleString("es-CL")}
                />
                <StatTile label="Integrantes" value={data.estadisticas.integrantesTotal.toLocaleString("es-CL")} />
                <StatTile label="Notas pendientes" value={data.estadisticas.notasPendientes.toLocaleString("es-CL")} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Eventos de agenda</p>
                  <p className="mt-1 text-sm text-foreground">
                    {data.estadisticas.eventos.total.toLocaleString("es-CL")} en total ·{" "}
                    {data.estadisticas.eventos.proximos30d.toLocaleString("es-CL")} en los próximos 30 días
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Certificados emitidos</p>
                  <p className="mt-1 text-sm text-foreground">{data.estadisticas.certificados.total.toLocaleString("es-CL")} en total</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Certificados por tipo</p>
                  <div className="mt-3">
                    <HorizontalBars
                      data={(Object.keys(CERTIFICADOS_LABEL) as (keyof typeof CERTIFICADOS_LABEL)[]).map((tipo) => ({
                        label: CERTIFICADOS_LABEL[tipo],
                        value: data.estadisticas.certificados.porTipo[tipo],
                      }))}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Certificados por mes</p>
                  <div className="mt-3">
                    <VerticalBars
                      data={data.estadisticas.certificados.porMes.map((p) => ({
                        label: formatMesCorto(p.mes),
                        value: p.cantidad,
                      }))}
                      ariaLabel="Certificados emitidos por mes, últimos 6 meses"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-foreground">Facturación</h2>
                  {data.facturacion === null ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.planPrevioMora
                        ? `Plan gratuito por mora: al confirmar el pago recupera el plan ${PLAN_LABEL[data.planPrevioMora]}.`
                        : "Plan gratuito: sin facturación."}
                    </p>
                  ) : (
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
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Último pago: {data.ultimoPagoAt ? new Date(data.ultimoPagoAt).toLocaleDateString("es-CL") : "Nunca"}
                  </p>
                </div>
                {/* GRATUITO sin plan previo: no hay nada que "pagar" (el backend
                    responde 400) — para contratar se usa "Cambiar plan". */}
                <Button
                  type="button"
                  onClick={marcarPagada}
                  disabled={accionEnCurso !== null || (data.plan === "GRATUITO" && !data.planPrevioMora)}
                  title={
                    data.plan === "GRATUITO" && !data.planPrevioMora
                      ? "Iglesia en plan gratuito: para contratar usa \"Cambiar plan\""
                      : undefined
                  }
                >
                  {accionEnCurso === "pagada" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : data.planPrevioMora ? (
                    `Confirmar pago y restaurar plan ${PLAN_LABEL[data.planPrevioMora]}`
                  ) : (
                    "Marcar como pagada"
                  )}
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
                        {PLANES_TODOS.map((plan) => (
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
                  {data.plan === "GRATUITO" && planSeleccionado !== "GRATUITO" && (
                    <p className="text-xs text-muted-foreground">
                      Se fijará la próxima facturación a 30 días y se verificará la iglesia.
                    </p>
                  )}
                </div>

                {data.facturacion && (
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
                      onClick={() => setConfirmFacturacionOpen(true)}
                      disabled={accionEnCurso !== null || !fechaFacturacion}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
                )}
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
                      disabled={accionEnCurso !== null || !data.facturacion?.puedeOcultar}
                      title={!data.facturacion?.puedeOcultar ? "Disponible cuando la mora supere los 3 días" : undefined}
                    >
                      {accionEnCurso === "ocultar" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ocultar iglesia"}
                    </Button>
                    {!data.facturacion?.puedeOcultar && (
                      <p className="text-xs text-muted-foreground">
                        Solo para planes de pago con 3 o más días de mora. El cobro diario ya las pasa a gratuito al
                        tercer día, así que queda como herramienta manual de respaldo.
                      </p>
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

            {/* Plan gratuito sin facturación: se esconde el historial (vacío). */}
            {data.facturacion && <HistorialPagosCard iglesiaId={data.id} />}

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

            <CambiarFacturacionDialog
              iglesiaId={data.id}
              iglesiaNombre={data.nombre}
              nuevaFecha={fechaFacturacion}
              open={confirmFacturacionOpen}
              onOpenChange={setConfirmFacturacionOpen}
              onActualizado={setData}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
