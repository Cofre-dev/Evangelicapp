"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Building2, Loader2 } from "lucide-react";

import { ProximosEventos } from "@/components/agenda/proximos-eventos";
import type { Evento } from "@/components/agenda/types";
import { formatoCLP, type FinanzasDashboard } from "@/components/finanzas/types";
import { MisTareasModal } from "@/components/notas/mis-tareas-modal";
import type { Nota } from "@/components/notas/types";
import type { UsuarioEquipo } from "@/components/usuarios/types";
import { useCountUp } from "@/hooks/use-count-up";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { API_URL, apiFetch } from "@/lib/api";
import type { DashboardResponse } from "@/app/superadmin/page";
import { type Rol } from "@/stores/auth-store";

const ROLES_CON_TAREAS = ["PASTOR", "TESORERO", "SECRETARIA"];
const ROLES_CON_AGENDA = ["PASTOR", "TESORERO", "SECRETARIA"];
// Mismo criterio de acceso que ya rigen /finanzas (ROLES_CON_ACCESO) y /usuarios (rol === "PASTOR"):
// las tarjetas de "Resumen" son un preview de esos módulos, no un criterio nuevo.
const ROLES_CON_BALANCE_CAJA = ["PASTOR", "TESORERO"];
const ROLES_CON_RESUMEN = ["PASTOR", "TESORERO", "SUPER_ADMIN"];

const ROL_LABEL: Record<Rol, string> = {
  PASTOR: "Pastor",
  TESORERO: "Tesorero",
  SECRETARIA: "Secretaria",
  SUPER_ADMIN: "Administrador",
  MIEMBRO: "Miembro",
};

function ResumenTile({
  href,
  label,
  value,
  formato = (n: number) => String(n),
  secondary,
}: {
  href: string;
  label: string;
  /** Valor numérico crudo — se anima con conteo ascendente al montar/actualizar. */
  value: number;
  /** Formatea el valor animado para mostrar (ej. formatoCLP.format). Por defecto, String(). */
  formato?: (n: number) => string;
  secondary?: ReactNode;
}) {
  const animado = useCountUp(value);
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{formato(animado)}</p>
      {secondary && <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>}
    </Link>
  );
}

/** Comparación de balance vs. el mes calendario anterior — mismo endpoint, sin backend nuevo. */
function ComparacionBalance({ actual, anterior }: { actual: number; anterior: number | null }) {
  if (anterior === null || anterior === 0) return null;
  const cambio = Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
  const subio = cambio >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${subio ? "text-emerald-600" : "text-rose-600"}`}>
      {subio ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {subio ? "+" : ""}
      {cambio}% vs. mes pasado
    </span>
  );
}

function ResumenTileSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-3 h-7 w-20 rounded bg-muted" />
    </div>
  );
}

function saludoSegunHora(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function Home() {
  const { usuario, ready } = useRequireAuth();

  const [tareas, setTareas] = useState<Nota[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [modalTareasOpen, setModalTareasOpen] = useState(false);
  const [eventosProximos, setEventosProximos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [balanceMes, setBalanceMes] = useState<number | null>(null);
  const [balanceMesAnterior, setBalanceMesAnterior] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [miembrosEquipo, setMiembrosEquipo] = useState<number | null>(null);
  const [loadingMiembros, setLoadingMiembros] = useState(true);
  const [statsSuperAdmin, setStatsSuperAdmin] = useState<DashboardResponse["totales"] | null>(null);
  const [loadingStatsSuperAdmin, setLoadingStatsSuperAdmin] = useState(true);

  const cargarTareas = useCallback(async () => {
    if (!usuario || !ROLES_CON_TAREAS.includes(usuario.rol)) {
      setLoadingTareas(false);
      return;
    }
    setLoadingTareas(true);
    try {
      const data = await apiFetch<Nota[]>("/notas/mis-tareas");
      setTareas(data);
    } catch {
      // Si falla, simplemente no se muestra el aviso — no es una acción crítica del usuario.
    } finally {
      setLoadingTareas(false);
    }
  }, [usuario]);

  const cargarEventosProximos = useCallback(async () => {
    if (!usuario || !ROLES_CON_AGENDA.includes(usuario.rol)) {
      setLoadingEventos(false);
      return;
    }
    setLoadingEventos(true);
    try {
      const ahora = new Date();
      const en30Dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
      const data = await apiFetch<Evento[]>(
        `/agenda/eventos?from=${ahora.toISOString()}&to=${en30Dias.toISOString()}`,
      );
      const proximos = data
        .filter((e) => new Date(e.fechaFin) >= ahora)
        .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
        .slice(0, 5);
      setEventosProximos(proximos);
    } catch {
      // Igual que las tareas: no es crítico, la sección simplemente queda vacía.
    } finally {
      setLoadingEventos(false);
    }
  }, [usuario]);

  // Mismo rango de mes (primer y último día) que rangoMes() en finanzas/page.tsx.
  // Además trae el mes calendario anterior (mismo endpoint, segunda llamada) para
  // mostrar la comparación "+N% vs. mes pasado" — si esa segunda llamada falla,
  // el balance del mes actual igual se muestra, solo sin la comparación.
  const cargarBalanceMes = useCallback(async () => {
    if (!usuario || !ROLES_CON_BALANCE_CAJA.includes(usuario.rol)) {
      setLoadingBalance(false);
      return;
    }
    setLoadingBalance(true);
    try {
      const ahora = new Date();
      const from = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const to = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
      const fromAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const toAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59);

      const [actual, anterior] = await Promise.all([
        apiFetch<FinanzasDashboard>(
          `/finanzas/movimientos/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`,
        ),
        apiFetch<FinanzasDashboard>(
          `/finanzas/movimientos/dashboard?from=${fromAnterior.toISOString()}&to=${toAnterior.toISOString()}`,
        ).catch(() => null),
      ]);
      setBalanceMes(actual.totales.balance);
      setBalanceMesAnterior(anterior?.totales.balance ?? null);
    } catch {
      // Si falla, la tarjeta simplemente no se muestra.
    } finally {
      setLoadingBalance(false);
    }
  }, [usuario]);

  const cargarMiembrosEquipo = useCallback(async () => {
    if (!usuario || usuario.rol !== "PASTOR") {
      setLoadingMiembros(false);
      return;
    }
    setLoadingMiembros(true);
    try {
      const data = await apiFetch<UsuarioEquipo[]>("/usuarios");
      setMiembrosEquipo(data.length);
    } catch {
      // Igual que el resto: si falla, la tarjeta no se muestra.
    } finally {
      setLoadingMiembros(false);
    }
  }, [usuario]);

  const cargarStatsSuperAdmin = useCallback(async () => {
    if (!usuario || usuario.rol !== "SUPER_ADMIN") {
      setLoadingStatsSuperAdmin(false);
      return;
    }
    setLoadingStatsSuperAdmin(true);
    try {
      const data = await apiFetch<DashboardResponse>("/superadmin/dashboard");
      setStatsSuperAdmin(data.totales);
    } catch {
      // Igual que el resto: si falla, la tarjeta no se muestra.
    } finally {
      setLoadingStatsSuperAdmin(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);

  useEffect(() => {
    cargarEventosProximos();
  }, [cargarEventosProximos]);

  useEffect(() => {
    cargarBalanceMes();
  }, [cargarBalanceMes]);

  useEffect(() => {
    cargarMiembrosEquipo();
  }, [cargarMiembrosEquipo]);

  useEffect(() => {
    cargarStatsSuperAdmin();
  }, [cargarStatsSuperAdmin]);

  function onTareaActualizada(tarea: Nota) {
    setTareas((prev) => (tarea.estado === "EN_REVISION" ? prev.map((t) => (t.id === tarea.id ? tarea : t)) : prev.filter((t) => t.id !== tarea.id)));
  }

  if (!ready || !usuario) {
    return (
      <main className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const fechaHoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const loadingResumen =
    (ROLES_CON_BALANCE_CAJA.includes(usuario.rol) && loadingBalance) ||
    (usuario.rol === "PASTOR" && loadingMiembros) ||
    (usuario.rol === "SUPER_ADMIN" && loadingStatsSuperAdmin);

  // Cantidad de tarjetas que realmente van a renderizar para este rol, para que el
  // skeleton no "salte" de tamaño al terminar de cargar (ej. tesorero solo ve 1 tarjeta).
  const resumenTileCount =
    (ROLES_CON_BALANCE_CAJA.includes(usuario.rol) ? 1 : 0) +
    (usuario.rol === "PASTOR" ? 1 : 0) +
    (usuario.rol === "SUPER_ADMIN" ? 2 : 0);

  return (
    <main className="min-h-full bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero: refuerza que la iglesia del pastor tiene un lugar propio y activo en la app. */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--accent)/0.55)_55%,hsl(var(--background)))] p-8 shadow-sm sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[hsl(var(--primary)/0.18)] blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-[hsl(var(--accent)/0.5)] blur-3xl"
          />

          {/* Rayos de luz: cielo abierto — motivo evocador de presencia/calidez, no literal. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[12%] w-8 rotate-[16deg] bg-[linear-gradient(to_bottom,hsl(var(--primary)/0.22),transparent_70%)] blur-xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[45%] w-6 rotate-[6deg] bg-[linear-gradient(to_bottom,hsl(var(--accent)/0.45),transparent_65%)] blur-xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[70%] w-10 -rotate-[14deg] bg-[linear-gradient(to_bottom,hsl(var(--primary)/0.16),transparent_75%)] blur-xl"
          />

          {/* Shimmer sutil: barrido de brillo diagonal — solo anima si el usuario no pidió reducir movimiento. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[length:200%_100%] bg-no-repeat bg-[linear-gradient(115deg,transparent_35%,hsl(var(--primary-foreground)/0.3)_50%,transparent_65%)] motion-safe:animate-shimmer"
          />

          {/* Silueta de cordillera: motivo reconocible del paisaje/iconografía chilena. */}
          <svg
            aria-hidden
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full sm:h-24"
          >
            <path
              d="M0,100 L0,72 L38,36 L74,58 L112,24 L150,52 L188,18 L228,54 L272,30 L318,56 L358,32 L400,60 L400,100 Z"
              fill="hsl(var(--primary)/0.12)"
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <p className="font-display text-3xl italic text-primary sm:text-4xl">
                {saludoSegunHora()}, {usuario.nombre}
              </p>
              <p className="mt-1 text-sm uppercase tracking-wide text-muted-foreground">{ROL_LABEL[usuario.rol]}</p>
              <p className="mt-4 text-sm capitalize text-muted-foreground">{fechaHoy}</p>
            </div>

            {usuario.iglesia && (
              <div className="flex flex-col items-center gap-3 sm:items-end">
                {usuario.iglesia.logoUrl ? (
                  <Image
                    src={`${API_URL}${usuario.iglesia.logoUrl}`}
                    alt={`Logo de ${usuario.iglesia.nombre}`}
                    width={96}
                    height={96}
                    className="h-20 w-20 rounded-full border-4 border-card object-cover shadow-md sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-primary/15 text-primary shadow-md sm:h-24 sm:w-24">
                    <Building2 className="h-9 w-9 sm:h-10 sm:w-10" />
                  </div>
                )}
                <p className="text-lg font-semibold text-foreground">{usuario.iglesia.nombre}</p>
                <p className="text-xs font-medium text-primary">Tu iglesia está aquí, activa y presente</p>
              </div>
            )}
          </div>
        </div>

        {ROLES_CON_TAREAS.includes(usuario.rol) &&
          (loadingTareas ? (
            <div className="mt-6 flex w-full animate-pulse items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          ) : (
            tareas.length > 0 && (
              <button
                type="button"
                onClick={() => setModalTareasOpen(true)}
                className="mt-6 flex w-full items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left shadow-sm transition-all hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Bell className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-amber-900">
                    Tienes {tareas.length} {tareas.length === 1 ? "tarea" : "tareas"} pendiente
                    {tareas.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-amber-700">Toca aquí para verlas</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-amber-700" />
              </button>
            )
          ))}

        {ROLES_CON_RESUMEN.includes(usuario.rol) && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-muted-foreground">Resumen</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {loadingResumen ? (
                Array.from({ length: resumenTileCount }, (_, i) => <ResumenTileSkeleton key={i} />)
              ) : (
                <>
                  {ROLES_CON_BALANCE_CAJA.includes(usuario.rol) && balanceMes !== null && (
                    <ResumenTile
                      href="/finanzas"
                      label="Balance de caja (mes actual)"
                      value={balanceMes}
                      formato={formatoCLP.format}
                      secondary={<ComparacionBalance actual={balanceMes} anterior={balanceMesAnterior} />}
                    />
                  )}
                  {usuario.rol === "PASTOR" && miembrosEquipo !== null && (
                    <ResumenTile href="/usuarios" label="Miembros del equipo" value={miembrosEquipo} />
                  )}
                  {usuario.rol === "SUPER_ADMIN" && statsSuperAdmin !== null && (
                    <>
                      <ResumenTile
                        href="/superadmin"
                        label="Iglesias activas"
                        value={statsSuperAdmin.iglesiasActivas}
                        secondary={`de ${statsSuperAdmin.iglesias} registradas`}
                      />
                      <ResumenTile href="/superadmin" label="Pastores" value={statsSuperAdmin.pastores} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {ROLES_CON_AGENDA.includes(usuario.rol) && <ProximosEventos eventos={eventosProximos} loading={loadingEventos} />}
      </div>

      <MisTareasModal
        open={modalTareasOpen}
        onOpenChange={setModalTareasOpen}
        tareas={tareas}
        onTareaActualizada={onTareaActualizada}
      />
    </main>
  );
}
