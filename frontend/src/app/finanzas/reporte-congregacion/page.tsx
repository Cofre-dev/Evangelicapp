"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronDown, Eye, Loader2, Mail, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { QrDialog } from "@/components/integrantes/qr-dialog";
import {
  formatearFechaHora,
  formatearFechaLarga,
  labelPeriodo,
  periodosCerrados,
  type CategoriaReporte,
  type ConfiguracionReporte,
  type EnvioReporte,
  type EnvioReporteConSnapshot,
  type ReporteFinancieroData,
  type VistaPreviaReporte,
} from "@/components/finanzas/reporte-congregacion/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";

// Configurar el reporte a la congregación es exclusivo del MANAGER (pastor):
// a diferencia de los movimientos de Finanzas, NO es delegable a un USUARIO
// con el módulo FINANZAS — el backend le responde 403.
const ROLES_CON_ACCESO = ["MANAGER"];

const BASE = "/finanzas/reporte-congregacion";
const POLLING_MS = 5000;
const POLLING_MAX_MS = 10 * 60 * 1000;

// El prompt pide el formato estándar de CLP con decimales posibles; los montos
// del reporte pueden traer 2 decimales.
const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

function mensaje(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function Card({
  titulo,
  descripcion,
  children,
  id,
}: {
  titulo: string;
  descripcion?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
      {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MiniStat({ label, value, negativo }: { label: string; value: number; negativo?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold sm:text-lg ${negativo ? "text-destructive" : "text-foreground"}`}>
        {clp.format(value)}
      </p>
    </div>
  );
}

function reporteVacio(r: ReporteFinancieroData): boolean {
  return (
    r.totales.ingresos === 0 &&
    r.totales.egresos === 0 &&
    r.ingresosPorCategoria.length === 0 &&
    r.egresosPorCategoria.length === 0
  );
}

function origenLabel(origen: EnvioReporte["origen"]): string {
  return origen === "AUTOMATICO" ? "Automático" : "Manual";
}

export default function ReporteCongregacionPage() {
  const { usuario, ready } = useRequireAuth();
  const esManager = Boolean(usuario && ROLES_CON_ACCESO.includes(usuario.rol));

  const [config, setConfig] = useState<ConfiguracionReporte | null>(null);
  const [envios, setEnvios] = useState<EnvioReporteConSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);

  // A) interruptor
  const [cambiandoActivo, setCambiandoActivo] = useState(false);
  const [confirmarActivarOpen, setConfirmarActivarOpen] = useState(false);

  // C) vista previa / envío manual
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaReporte | null>(null);
  const [cargandoVista, setCargandoVista] = useState(false);
  const [errorVista, setErrorVista] = useState<string | null>(null);
  const [confirmarEnviarOpen, setConfirmarEnviarOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const vistaPreviaRef = useRef<HTMLDivElement | null>(null);

  // D) historial
  const [envioDetalle, setEnvioDetalle] = useState<EnvioReporteConSnapshot | null>(null);
  const pollingInicioRef = useRef<number | null>(null);

  // E) categorías: la UI muestra "visible", la API recibe la lista de OCULTAS.
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [guardandoCategorias, setGuardandoCategorias] = useState(false);

  const aplicarConfig = useCallback((data: ConfiguracionReporte) => {
    setConfig(data);
    setOcultas(new Set(data.categorias.filter((c) => c.ocultaEnReporte).map((c) => c.id)));
  }, []);

  const cargarEnvios = useCallback(async () => {
    const data = await apiFetch<EnvioReporteConSnapshot[]>(`${BASE}/envios`);
    setEnvios(data);
    return data;
  }, []);

  useEffect(() => {
    if (!ready || !esManager) return;
    let cancelado = false;
    setLoading(true);
    setError(null);
    Promise.all([apiFetch<ConfiguracionReporte>(BASE), apiFetch<EnvioReporteConSnapshot[]>(`${BASE}/envios`)])
      .then(([configData, enviosData]) => {
        if (cancelado) return;
        aplicarConfig(configData);
        setEnvios(enviosData);
        setPeriodo((prev) => prev ?? configData.periodoSugerido);
      })
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 403) setSinPermiso(true);
        else setError(mensaje(err, "No se pudo cargar la configuración del reporte"));
      })
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
  }, [ready, esManager, aplicarConfig]);

  const cargarVistaPrevia = useCallback(async (p: string) => {
    setCargandoVista(true);
    setErrorVista(null);
    try {
      const data = await apiFetch<VistaPreviaReporte>(`${BASE}/vista-previa?periodo=${encodeURIComponent(p)}`);
      setVistaPrevia(data);
    } catch (err) {
      setVistaPrevia(null);
      setErrorVista(mensaje(err, "No se pudo cargar la vista previa"));
    } finally {
      setCargandoVista(false);
    }
  }, []);

  useEffect(() => {
    if (periodo) cargarVistaPrevia(periodo);
  }, [periodo, cargarVistaPrevia]);

  // Polling del historial mientras haya algún envío en curso (máx. 10 min).
  const hayEnCurso = envios.some((e) => e.completadoEn === null);
  useEffect(() => {
    if (!hayEnCurso) {
      pollingInicioRef.current = null;
      return;
    }
    if (pollingInicioRef.current === null) pollingInicioRef.current = Date.now();
    const id = setInterval(() => {
      if (pollingInicioRef.current !== null && Date.now() - pollingInicioRef.current > POLLING_MAX_MS) {
        clearInterval(id);
        return;
      }
      cargarEnvios().catch(() => {
        // Error transitorio: se reintenta en el próximo tick.
      });
    }, POLLING_MS);
    return () => clearInterval(id);
  }, [hayEnCurso, cargarEnvios]);

  const opcionesPeriodo = useMemo(
    () => {
      if (!config) return [];
      const lista = periodosCerrados(config.mesesAtrasPermitidos);
      // Por si el reloj del navegador y el del backend difieren en el borde de mes.
      return lista.includes(config.periodoSugerido) ? lista : [config.periodoSugerido, ...lista];
    },
    [config],
  );

  // ---------- A) interruptor ----------
  async function setActivo(activo: boolean) {
    if (!config) return;
    const anterior = config;
    setCambiandoActivo(true);
    setConfig({ ...config, activo }); // optimista
    try {
      const data = await apiFetch<ConfiguracionReporte>(BASE, {
        method: "PATCH",
        body: JSON.stringify({ activo }),
      });
      aplicarConfig(data);
      toast(activo ? "Reporte mensual activado" : "Reporte mensual desactivado");
    } catch (err) {
      setConfig(anterior);
      toast.error(mensaje(err, "No se pudo cambiar el envío automático"));
    } finally {
      setCambiandoActivo(false);
    }
  }

  function onSwitch(checked: boolean) {
    if (checked) setConfirmarActivarOpen(true);
    else setActivo(false);
  }

  function irAVistaPrevia() {
    setConfirmarActivarOpen(false);
    // Esperar a que el diálogo se cierre (devuelve el scroll al body) antes de desplazar.
    setTimeout(() => vistaPreviaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }

  // ---------- C) envío manual ----------
  async function enviarAhora() {
    if (!periodo || !vistaPrevia) return;
    setEnviando(true);
    try {
      const envio = await apiFetch<EnvioReporte>(`${BASE}/enviar`, {
        method: "POST",
        body: JSON.stringify({ periodo }),
      });
      setConfirmarEnviarOpen(false);
      toast(`Enviando el reporte a ${envio.destinatarios} integrantes…`);
      setEnvios((prev) => [{ ...envio, snapshot: vistaPrevia.reporte }, ...prev.filter((e) => e.id !== envio.id)]);
      setVistaPrevia((prev) => (prev ? { ...prev, envioExistente: envio } : prev));
      cargarEnvios().catch(() => {});
    } catch (err) {
      setConfirmarEnviarOpen(false);
      toast.error(mensaje(err, "No se pudo enviar el reporte"));
      if (err instanceof ApiError && err.status === 409) {
        cargarVistaPrevia(periodo);
        cargarEnvios().catch(() => {});
      }
    } finally {
      setEnviando(false);
    }
  }

  // ---------- E) categorías ----------
  const ocultasGuardadas = useMemo(
    () => new Set(config?.categorias.filter((c) => c.ocultaEnReporte).map((c) => c.id) ?? []),
    [config],
  );
  const hayCambiosCategorias =
    ocultas.size !== ocultasGuardadas.size || [...ocultas].some((id) => !ocultasGuardadas.has(id));

  function toggleVisible(id: string, visible: boolean) {
    setOcultas((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function guardarCategorias() {
    setGuardandoCategorias(true);
    try {
      const data = await apiFetch<ConfiguracionReporte>(`${BASE}/categorias-ocultas`, {
        method: "PUT",
        body: JSON.stringify({ categoriaIds: [...ocultas] }),
      });
      aplicarConfig(data);
      toast("Categorías actualizadas");
      if (periodo) cargarVistaPrevia(periodo);
    } catch (err) {
      toast.error(mensaje(err, "No se pudieron guardar las categorías"));
    } finally {
      setGuardandoCategorias(false);
    }
  }

  // ---------- render ----------
  if (!ready || !usuario) return null;

  if (!esManager || sinPermiso) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">Solo el pastor puede configurar el reporte.</p>
        <Button asChild variant="outline">
          <Link href="/finanzas">Volver a Finanzas</Link>
        </Button>
      </main>
    );
  }

  const categoriasIngreso = config?.categorias.filter((c) => c.tipo === "INGRESO") ?? [];
  const categoriasEgreso = config?.categorias.filter((c) => c.tipo === "EGRESO") ?? [];
  const destinatariosVista = vistaPrevia?.destinatarios ?? 0;
  const motivoEnvioDeshabilitado = vistaPrevia?.envioExistente
    ? "Este mes ya se envió"
    : destinatariosVista === 0
      ? "Nadie ha aceptado recibirlo todavía"
      : undefined;

  return (
    <main className="h-full bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/finanzas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Finanzas
        </Link>

        <div className="mt-4">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Mail className="h-5 w-5 text-primary" aria-hidden />
            Reporte a la congregación
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un resumen mensual de las finanzas, solo con totales, para los integrantes que aceptaron recibirlo.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          config && (
            <div className="mt-6 space-y-6">
              {/* A) Envío automático */}
              <Card titulo="Envío automático">
                <div className="flex items-start justify-between gap-4">
                  <label htmlFor="switch-reporte" className="text-sm font-medium text-foreground">
                    Enviar el reporte financiero cada mes a la congregación
                  </label>
                  <Switch
                    id="switch-reporte"
                    checked={config.activo}
                    onCheckedChange={onSwitch}
                    disabled={cambiandoActivo}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {config.activo ? (
                    <>
                      Se envía automáticamente el día 1 de cada mes.
                      {config.proximoEnvioAutomatico && (
                        <>
                          {" "}
                          Próximo envío:{" "}
                          <strong className="text-foreground">
                            {formatearFechaLarga(config.proximoEnvioAutomatico)}
                          </strong>
                          .
                        </>
                      )}
                      {config.activadoPor && config.activadoEn && (
                        <>
                          {" "}
                          Activado por {config.activadoPor.nombre} {config.activadoPor.apellido} el{" "}
                          {formatearFechaLarga(config.activadoEn)}.
                        </>
                      )}
                    </>
                  ) : (
                    "Apagado. No se enviará nada automáticamente."
                  )}
                </p>
              </Card>

              {/* B) Destinatarios */}
              <Card titulo="Destinatarios">
                <p className="text-sm text-muted-foreground">
                  <span className="text-3xl font-semibold text-foreground">{config.destinatarios.aceptan}</span> de{" "}
                  {config.destinatarios.totalIntegrantes} integrantes aceptaron recibir el reporte.
                </p>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={config.destinatarios.totalIntegrantes}
                  aria-valuenow={config.destinatarios.aceptan}
                  aria-label="Integrantes que aceptaron el reporte"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${
                        config.destinatarios.totalIntegrantes > 0
                          ? (config.destinatarios.aceptan / config.destinatarios.totalIntegrantes) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {config.destinatarios.aceptan === 0 && (
                  <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      Todavía nadie ha aceptado recibir el reporte. Los integrantes lo aceptan al registrarse con el
                      QR de la iglesia.
                    </p>
                    <QrDialog />
                  </div>
                )}

                <details className="group mt-4 text-sm">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                    ¿Cómo se suman más personas?
                  </summary>
                  <p className="mt-2 text-muted-foreground">
                    Cada persona acepta al registrarse con el QR marcando la casilla del reporte financiero. Por
                    privacidad, el equipo no puede suscribir a nadie, y quienes ya estaban registrados antes de esta
                    opción todavía no pueden sumarse por su cuenta (lo resolveremos en una próxima versión).
                  </p>
                </details>
              </Card>

              {/* C) Vista previa y envío manual */}
              <div ref={vistaPreviaRef} className="scroll-mt-6">
                <Card
                  titulo="Vista previa y envío manual"
                  descripcion="Puedes enviar a mano el reporte de cualquier mes cerrado de los últimos 12 meses, aunque el envío automático esté apagado."
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Select value={periodo ?? undefined} onValueChange={setPeriodo}>
                      <SelectTrigger className="w-full sm:w-[220px]" aria-label="Mes del reporte">
                        <SelectValue placeholder="Elige un mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {opcionesPeriodo.map((p) => (
                          <SelectItem key={p} value={p}>
                            {labelPeriodo(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <span title={motivoEnvioDeshabilitado} className="w-full sm:w-auto">
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => setConfirmarEnviarOpen(true)}
                          disabled={!vistaPrevia || cargandoVista || Boolean(motivoEnvioDeshabilitado)}
                        >
                          <Send className="h-4 w-4" />
                          Enviar ahora
                        </Button>
                      </span>
                      {vistaPrevia?.envioExistente ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          Ya enviado el {formatearFechaHora(vistaPrevia.envioExistente.createdAt)} (
                          {vistaPrevia.envioExistente.origen === "AUTOMATICO" ? "automático" : "manual"})
                        </span>
                      ) : (
                        vistaPrevia &&
                        destinatariosVista === 0 && (
                          <span className="text-xs text-muted-foreground">Nadie ha aceptado recibirlo todavía</span>
                        )
                      )}
                    </div>
                  </div>

                  {errorVista && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>{errorVista}</AlertDescription>
                    </Alert>
                  )}

                  {cargandoVista && !vistaPrevia && (
                    <div className="mt-4 flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando vista previa...
                    </div>
                  )}

                  {vistaPrevia && (
                    <div className={`mt-4 space-y-4 ${cargandoVista ? "opacity-60" : ""}`}>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <MiniStat label="Ingresos" value={vistaPrevia.reporte.totales.ingresos} />
                        <MiniStat label="Egresos" value={vistaPrevia.reporte.totales.egresos} />
                        <MiniStat
                          label="Balance"
                          value={vistaPrevia.reporte.totales.balance}
                          negativo={vistaPrevia.reporte.totales.balance < 0}
                        />
                      </div>

                      {reporteVacio(vistaPrevia.reporte) && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Este mes no tiene movimientos registrados; el reporte saldría en cero.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <p className="mb-2 text-sm text-foreground">
                          <span className="text-muted-foreground">Asunto:</span> {vistaPrevia.asunto}
                        </p>
                        {/* sandbox="" sin permisos: sin scripts ni navegación, solo para mirar.
                            Nunca renderizar este HTML con dangerouslySetInnerHTML. */}
                        <iframe
                          title="Vista previa del correo"
                          srcDoc={vistaPrevia.html}
                          sandbox=""
                          className="h-[640px] w-full rounded-md border bg-white"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Así lo verá cada integrante (con su propio nombre en el saludo).
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* D) Historial */}
              <Card titulo="Historial de envíos">
                {envios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todavía no se ha enviado ningún reporte.</p>
                ) : (
                  <div className="-mx-5 overflow-x-auto sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mes</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Enviado por</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead className="text-right">
                            <span className="sr-only">Detalle</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {envios.map((envio) => (
                          <TableRow key={envio.id}>
                            <TableCell className="whitespace-nowrap font-medium text-foreground">
                              {labelPeriodo(envio.periodo)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  envio.origen === "AUTOMATICO"
                                    ? "rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700"
                                    : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                                }
                              >
                                {origenLabel(envio.origen)}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {envio.enviadoPor ? `${envio.enviadoPor.nombre} ${envio.enviadoPor.apellido}` : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{formatearFechaHora(envio.createdAt)}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {envio.completadoEn === null ? (
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Enviando… ({envio.destinatarios} destinatarios)
                                </span>
                              ) : (
                                <span className="inline-flex flex-wrap items-center gap-2">
                                  {envio.enviados ?? 0} enviados
                                  {(envio.fallidos ?? 0) > 0 && (
                                    <span
                                      className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                                      title="Algunos correos no se pudieron entregar (casilla inválida o error del proveedor)"
                                    >
                                      {envio.fallidos} fallidos
                                    </span>
                                  )}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Ver reporte enviado de ${labelPeriodo(envio.periodo)}`}
                                onClick={() => setEnvioDetalle(envio)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>

              {/* E) Categorías visibles */}
              <Card
                titulo="Categorías visibles en el reporte"
                descripcion="Las categorías que desmarques no aparecerán por nombre en el reporte: su monto se sumará en 'Otros ingresos' u 'Otros egresos'. Los totales no cambian."
              >
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <GrupoCategorias
                    titulo="Ingresos"
                    categorias={categoriasIngreso}
                    ocultas={ocultas}
                    onToggle={toggleVisible}
                  />
                  <GrupoCategorias
                    titulo="Egresos"
                    categorias={categoriasEgreso}
                    ocultas={ocultas}
                    onToggle={toggleVisible}
                  />
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={guardarCategorias} disabled={!hayCambiosCategorias || guardandoCategorias}>
                    {guardandoCategorias && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar cambios
                  </Button>
                </div>
              </Card>
            </div>
          )
        )}
      </div>

      {/* Confirmación al encender el interruptor */}
      <Dialog open={confirmarActivarOpen} onOpenChange={setConfirmarActivarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Activar el reporte mensual?</DialogTitle>
            <DialogDescription>
              Cada día 1 se enviará a los <strong>{config?.destinatarios.aceptan ?? 0}</strong> integrantes que
              aceptaron recibirlo un resumen con los ingresos, egresos y el balance del mes anterior, con totales por
              categoría. Nunca se incluyen aportes individuales. Te recomendamos revisar la vista previa antes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmarActivarOpen(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={irAVistaPrevia}>
              Ver vista previa
            </Button>
            <Button
              onClick={() => {
                setConfirmarActivarOpen(false);
                setActivo(true);
              }}
            >
              Activar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de envío manual */}
      <Dialog open={confirmarEnviarOpen} onOpenChange={(open) => !enviando && setConfirmarEnviarOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ¿Enviar el reporte de {periodo ? labelPeriodo(periodo) : ""} a {destinatariosVista} integrantes?
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer y cada mes se puede enviar una sola vez.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmarEnviarOpen(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={enviarAhora} disabled={enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle (snapshot) de un envío del historial */}
      <Dialog open={envioDetalle !== null} onOpenChange={(open) => !open && setEnvioDetalle(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {envioDetalle && (
            <>
              <DialogHeader>
                <DialogTitle>Reporte de {labelPeriodo(envioDetalle.periodo)}</DialogTitle>
                <DialogDescription>
                  Los números tal como salieron en el correo, aunque después se hayan editado movimientos.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MiniStat label="Ingresos" value={envioDetalle.snapshot.totales.ingresos} />
                <MiniStat label="Egresos" value={envioDetalle.snapshot.totales.egresos} />
                <MiniStat
                  label="Balance"
                  value={envioDetalle.snapshot.totales.balance}
                  negativo={envioDetalle.snapshot.totales.balance < 0}
                />
              </div>
              <ListaTotales titulo="Ingresos por categoría" items={envioDetalle.snapshot.ingresosPorCategoria} />
              <ListaTotales titulo="Egresos por categoría" items={envioDetalle.snapshot.egresosPorCategoria} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function GrupoCategorias({
  titulo,
  categorias,
  ocultas,
  onToggle,
}: {
  titulo: string;
  categorias: CategoriaReporte[];
  ocultas: Set<string>;
  onToggle: (id: string, visible: boolean) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{titulo}</h3>
      {categorias.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Sin categorías.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {categorias.map((c) => {
            const id = `cat-${c.id}`;
            return (
              <li key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={!ocultas.has(c.id)}
                  onCheckedChange={(checked) => onToggle(c.id, checked === true)}
                />
                <label htmlFor={id} className="text-sm text-foreground">
                  {c.nombre}
                  {c.departamento && <span className="text-muted-foreground"> · {c.departamento.nombre}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ListaTotales({ titulo, items }: { titulo: string; items: { categoria: string; total: number }[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{titulo}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Sin movimientos.</p>
      ) : (
        <ul className="mt-1 divide-y divide-border text-sm">
          {items.map((i) => (
            <li key={i.categoria} className="flex justify-between gap-4 py-1.5">
              <span className="text-foreground">{i.categoria}</span>
              <span className="font-medium text-foreground">{clp.format(i.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
