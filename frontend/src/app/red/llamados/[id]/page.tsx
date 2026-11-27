"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  EyeOff,
  Flag,
  HeartHandshake,
  Loader2,
  MapPin,
  Pencil,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import { ConfirmarDialog } from "@/components/red/confirmar-dialog";
import { EditarLlamadoDialog } from "@/components/red/editar-llamado-dialog";
import { formatFecha, formatRangoOperativo, formatRelativo, pluralIglesias } from "@/components/red/format";
import { EstadoLlamadoBadge, ProgresoNecesidadItem } from "@/components/red/llamado-card";
import { puedeEscribirRed } from "@/components/red/permisos";
import { ReportarDialog } from "@/components/red/reportar-dialog";
import {
  TIPO_LLAMADO_LABEL,
  VISIBILIDAD_LABEL,
  type CompromisoEnLlamado,
  type EstadoLlamado,
  type LlamadoDetalle,
} from "@/components/red/types";
import { VerificadaBadge } from "@/components/red/verificada-badge";
import { YoTeAyudoDialog } from "@/components/red/yo-te-ayudo-dialog";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { ApiError, apiFetch } from "@/lib/api";
import { useRedStore } from "@/stores/red-store";

type Confirmacion =
  | { tipo: "estado"; estado: EstadoLlamado }
  | { tipo: "cancelar"; compromiso: CompromisoEnLlamado }
  | null;

export default function LlamadoDetallePage() {
  const params = useParams<{ id: string }>();
  const { usuario } = useRequireAuth();
  const cargarLimites = useRedStore((s) => s.cargarLimites);

  const [llamado, setLlamado] = useState<LlamadoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [limitePlan, setLimitePlan] = useState<string | null>(null);

  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [necesidadInicial, setNecesidadInicial] = useState<string | null | undefined>(undefined);
  const [reportarAbierto, setReportarAbierto] = useState(false);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
  const [estadoEnCurso, setEstadoEnCurso] = useState<EstadoLlamado | null>(null);

  const escribe = puedeEscribirRed(usuario);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!params.id) return;
      if (!silencioso) setLoading(true);
      try {
        setLlamado(await apiFetch<LlamadoDetalle>(`/red/llamados/${params.id}`));
        setNoDisponible(false);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setNoDisponible(true);
        else if (!silencioso) setError(err instanceof ApiError ? err.message : "No se pudo cargar el llamado");
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [params.id],
  );

  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario, cargar]);

  useRealtimeEvent("red:llamado-actualizado", ({ llamadoId }) => {
    if (llamadoId === params.id) void cargar(true);
  });

  async function cambiarEstado(estado: EstadoLlamado) {
    if (!llamado) return;
    setEstadoEnCurso(estado);
    setAccionError(null);
    setLimitePlan(null);
    try {
      const actualizado = await apiFetch<LlamadoDetalle>(`/red/llamados/${llamado.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setLlamado(actualizado);
      void cargarLimites();
      toast(estado === "CERRADO" ? "Llamado cerrado." : estado === "CUBIERTO" ? "Marcado como cubierto." : "Llamado reabierto.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "LIMITE_PLAN") setLimitePlan(err.message);
      else setAccionError(err instanceof ApiError ? err.message : "No se pudo cambiar el estado");
      throw err;
    } finally {
      setEstadoEnCurso(null);
    }
  }

  async function cancelarApoyo(compromiso: CompromisoEnLlamado) {
    try {
      await apiFetch(`/red/compromisos/${compromiso.id}`, { method: "DELETE" });
      toast("Cancelaste tu apoyo.");
      await cargar(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cancelar el apoyo");
      throw err;
    }
  }

  function abrirAyuda(necesidadId?: string | null) {
    setNecesidadInicial(necesidadId);
    setAyudaAbierta(true);
  }

  if (!usuario) return null;

  const volver = (
    <Link href="/red" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      Volver al feed
    </Link>
  );

  if (loading) {
    return (
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando llamado…
      </div>
    );
  }

  if (noDisponible) {
    return (
      <div>
        {volver}
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Este llamado no existe o no está disponible para tu iglesia.</p>
        </div>
      </div>
    );
  }

  if (error || !llamado) {
    return (
      <div>
        {volver}
        <Alert variant="destructive">
          <AlertDescription>{error ?? "No se pudo cargar el llamado"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const necesidades = [...llamado.necesidades].sort((a, b) => a.orden - b.orden);
  const rango = formatRangoOperativo(llamado.fechaInicio, llamado.fechaFin);
  const puedeAyudar = escribe && !llamado.esPropio && llamado.estado !== "CERRADO";
  const necesidadPorId = new Map(necesidades.map((n) => [n.id, n]));

  return (
    <div>
      {volver}

      {llamado.esPropio && llamado.ocultoModeracion && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex items-start gap-2">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Este llamado fue ocultado por moderación y las demás iglesias no lo ven.
          </AlertDescription>
        </Alert>
      )}

      <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <header className="flex items-start gap-3">
          <IglesiaLogo logoUrl={llamado.iglesia?.logoUrl ?? null} nombre={llamado.iglesia?.nombre ?? ""} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {llamado.iglesia && !llamado.esPropio ? (
                <Link
                  href={`/red/iglesias/${llamado.iglesia.iglesiaId}`}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {llamado.iglesia.nombre}
                </Link>
              ) : (
                <p className="text-sm font-medium text-foreground">{llamado.esPropio ? "Tu iglesia" : "Iglesia"}</p>
              )}
              {llamado.iglesia && !llamado.esPropio && <VerificadaBadge verificada={llamado.iglesia.verificada} />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Publicado {formatRelativo(llamado.createdAt)} · Visible para: {VISIBILIDAD_LABEL[llamado.visibilidad]}
            </p>
          </div>
        </header>

        <h1 className="mt-4 text-xl font-semibold leading-snug text-foreground sm:text-2xl">{llamado.titulo}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
            {TIPO_LLAMADO_LABEL[llamado.tipo]}
          </span>
          <EstadoLlamadoBadge estado={llamado.estado} />
        </div>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {llamado.direccion ? `${llamado.direccion}, ` : ""}
              {llamado.comuna}, {llamado.region}
            </span>
          </div>
          {rango && (
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{rango}</span>
            </div>
          )}
        </div>

        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">{llamado.descripcion}</p>

        {puedeAyudar && (
          <Button type="button" size="lg" className="mt-6 w-full sm:w-auto" onClick={() => abrirAyuda()}>
            <HeartHandshake aria-hidden />
            ¡Yo te ayudo!
          </Button>
        )}

        {llamado.esPropio && escribe && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditarAbierto(true)}>
              <Pencil aria-hidden />
              Editar
            </Button>
            {llamado.estado === "ABIERTO" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cambiarEstado("CUBIERTO").catch(() => {})}
                disabled={estadoEnCurso !== null}
              >
                {estadoEnCurso === "CUBIERTO" ? <Loader2 className="animate-spin" /> : <CheckCircle2 aria-hidden />}
                Marcar como cubierto
              </Button>
            )}
            {llamado.estado !== "ABIERTO" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cambiarEstado("ABIERTO").catch(() => {})}
                disabled={estadoEnCurso !== null}
              >
                {estadoEnCurso === "ABIERTO" ? <Loader2 className="animate-spin" /> : <RotateCcw aria-hidden />}
                Reabrir
              </Button>
            )}
            {llamado.estado !== "CERRADO" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmacion({ tipo: "estado", estado: "CERRADO" })}
                disabled={estadoEnCurso !== null}
              >
                <XCircle aria-hidden />
                Cerrar llamado
              </Button>
            )}
          </div>
        )}

        {limitePlan && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>
              {limitePlan}{" "}
              <Link href="/facturacion" className="font-medium underline">
                Ver planes
              </Link>
            </AlertDescription>
          </Alert>
        )}
        {accionError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{accionError}</AlertDescription>
          </Alert>
        )}
      </article>

      {necesidades.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-sm font-medium text-foreground">Necesidades</h2>
          <ul className="mt-4 space-y-4">
            {necesidades.map((n) => (
              <li key={n.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <ProgresoNecesidadItem necesidad={n} />
                </div>
                {puedeAyudar && (
                  <Button type="button" size="sm" variant="ghost" className="self-start sm:self-auto" onClick={() => abrirAyuda(n.id)}>
                    Ayudar con esto
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-medium text-foreground">
          Iglesias que apoyan
          <span className="ml-2 font-normal text-muted-foreground">{pluralIglesias(llamado.iglesiasApoyando)}</span>
        </h2>
        {llamado.compromisos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {llamado.esPropio ? "Aún ninguna iglesia se ha comprometido." : "Aún ninguna iglesia se ha comprometido. ¡Sé la primera!"}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {llamado.compromisos.map((c) => {
              const necesidad = c.necesidadId ? necesidadPorId.get(c.necesidadId) : null;
              return (
                <li key={c.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <IglesiaLogo logoUrl={c.iglesia?.logoUrl ?? null} nombre={c.iglesia?.nombre ?? ""} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {c.esPropio ? (
                          <p className="text-sm font-medium text-foreground">Tu iglesia</p>
                        ) : c.iglesia ? (
                          <Link
                            href={`/red/iglesias/${c.iglesia.iglesiaId}`}
                            className="text-sm font-medium text-foreground hover:underline"
                          >
                            {c.iglesia.nombre}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-foreground">Iglesia</p>
                        )}
                        <span className="text-xs text-muted-foreground">{formatFecha(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {necesidad ? necesidad.descripcion : "Apoyo general"}
                        {c.cantidad != null &&
                          ` · ${c.cantidad.toLocaleString("es-CL")}${necesidad?.unidad ? ` ${necesidad.unidad}` : ""}`}
                      </p>
                      {c.mensaje && <p className="mt-1 text-sm text-foreground">&ldquo;{c.mensaje}&rdquo;</p>}
                    </div>
                  </div>
                  {c.esPropio && escribe && (
                    <div className="flex gap-1 self-end sm:self-start">
                      {llamado.estado !== "CERRADO" && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => abrirAyuda(c.necesidadId)}>
                          Editar
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmacion({ tipo: "cancelar", compromiso: c })}
                      >
                        Cancelar mi apoyo
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!llamado.esPropio && escribe && (
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setReportarAbierto(true)}
          >
            <Flag aria-hidden />
            Reportar
          </Button>
        </div>
      )}

      {puedeAyudar && (
        <YoTeAyudoDialog
          llamado={llamado}
          open={ayudaAbierta}
          onOpenChange={setAyudaAbierta}
          necesidadInicial={necesidadInicial}
          onActualizado={setLlamado}
        />
      )}
      {!llamado.esPropio && escribe && (
        <ReportarDialog llamadoId={llamado.id} open={reportarAbierto} onOpenChange={setReportarAbierto} />
      )}
      {llamado.esPropio && escribe && (
        <EditarLlamadoDialog
          llamado={llamado}
          open={editarAbierto}
          onOpenChange={setEditarAbierto}
          onActualizado={setLlamado}
        />
      )}

      <ConfirmarDialog
        open={confirmacion !== null}
        onOpenChange={(o) => !o && setConfirmacion(null)}
        titulo={confirmacion?.tipo === "cancelar" ? "¿Cancelar tu apoyo?" : "¿Cerrar el llamado?"}
        descripcion={
          confirmacion?.tipo === "cancelar"
            ? "La iglesia autora recibirá un aviso de que ya no apoyas esta necesidad."
            : "Seguirá visible como cerrado, pero ya no aceptará apoyos. Podrás reabrirlo si tu plan tiene cupo."
        }
        confirmarLabel={confirmacion?.tipo === "cancelar" ? "Cancelar apoyo" : "Cerrar llamado"}
        destructivo
        onConfirmar={async () => {
          if (confirmacion?.tipo === "cancelar") await cancelarApoyo(confirmacion.compromiso);
          else if (confirmacion?.tipo === "estado") await cambiarEstado(confirmacion.estado);
        }}
      />
    </div>
  );
}
