"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  LayoutDashboard,
  NotebookPen,
  QrCode,
  Users,
  Wallet,
} from "lucide-react";

import { ProximosEventos } from "@/components/agenda/proximos-eventos";
import type { Evento } from "@/components/agenda/types";
import type { FacturacionResponse } from "@/components/facturacion/types";
import { MisTareasModal } from "@/components/notas/mis-tareas-modal";
import type { Nota } from "@/components/notas/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { API_URL, apiFetch } from "@/lib/api";
import { type Rol, type SessionUser } from "@/stores/auth-store";

/** MANAGER y USUARIO (ver frontend/prompt.md, sección 7 — aviso de facturación
 * en el dashboard). */
function tieneAccesoFacturacion(usuario: SessionUser): boolean {
  return usuario.rol === "MANAGER" || usuario.rol === "USUARIO";
}

/** Ver frontend/prompt.md: cualquier USUARIO (tenga o no módulos otorgados)
 * puede ver/marcar sus propias tareas asignadas — no depende de `modulos`. */
function tieneAccesoTareas(usuario: SessionUser): boolean {
  return usuario.rol === "MANAGER" || usuario.rol === "USUARIO";
}

/** AGENDA es uno de los 4 módulos delegables (ver frontend/prompt.md). */
function tieneAccesoAgenda(usuario: SessionUser): boolean {
  return usuario.rol === "MANAGER" || usuario.modulos.includes("AGENDA");
}

const ROL_LABEL: Record<Rol, string> = {
  MANAGER: "Manager",
  USUARIO: "Usuario",
  SUPER_ADMIN: "Administrador",
  MIEMBRO: "Miembro",
};

interface AccesoRapido {
  href: string;
  label: string;
  descripcion: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}

const ACCESO_AGENDA: AccesoRapido = { href: "/agenda", label: "Agenda", descripcion: "Cultos, reuniones y actividades", icon: CalendarDays, tint: "bg-sky-100 text-sky-700" };
const ACCESO_FINANZAS: AccesoRapido = { href: "/finanzas", label: "Finanzas", descripcion: "Ingresos, egresos y balance", icon: Wallet, tint: "bg-emerald-100 text-emerald-700" };
const ACCESO_NOTAS: AccesoRapido = { href: "/notas", label: "Notas", descripcion: "Recordatorios y tareas pendientes", icon: NotebookPen, tint: "bg-amber-100 text-amber-700" };
const ACCESO_EQUIPO: AccesoRapido = { href: "/equipo", label: "Equipo", descripcion: "Tu equipo pastoral, con foto", icon: Users, tint: "bg-violet-100 text-violet-700" };
const ACCESO_INTEGRANTES: AccesoRapido = { href: "/integrantes", label: "Integrantes", descripcion: "Censo de la congregación por QR", icon: QrCode, tint: "bg-rose-100 text-rose-700" };
const ACCESO_DASHBOARD: AccesoRapido = { href: "/superadmin", label: "Dashboard", descripcion: "Iglesias registradas en la plataforma", icon: LayoutDashboard, tint: "bg-sky-100 text-sky-700" };

/**
 * Accesos rápidos por módulo delegable — igual que en el navbar
 * (`MODULO_NAV_ITEM`), CEREMONIAS queda fuera porque no tiene una única
 * pantalla de destino (4 submódulos, sin vista combinada, ver
 * frontend/prompt.md sección 10 y la entrada de Ceremonias en FEATURES.md).
 */
const MODULO_ACCESO_RAPIDO: Partial<Record<string, AccesoRapido>> = {
  AGENDA: ACCESO_AGENDA,
  FINANZAS: ACCESO_FINANZAS,
  INTEGRANTES: ACCESO_INTEGRANTES,
};

const ORDEN_MODULOS_ACCESOS = ["AGENDA", "FINANZAS", "INTEGRANTES"];

/** MANAGER ve siempre los mismos accesos de trabajo diario (Notas/Equipo son
 * exclusivos suyos, no delegables); un USUARIO solo ve los módulos que el
 * MANAGER le otorgó. Accesos/Mi iglesia/Perfil no aparecen acá a propósito,
 * igual que antes: esta grilla es solo para módulos de trabajo diario, no de
 * configuración de cuenta (ver entrada 2026-07-27 de FEATURES.md). */
function buildAccesos(usuario: SessionUser): AccesoRapido[] {
  if (usuario.rol === "MANAGER") {
    return [ACCESO_AGENDA, ACCESO_FINANZAS, ACCESO_NOTAS, ACCESO_EQUIPO, ACCESO_INTEGRANTES];
  }
  if (usuario.rol === "USUARIO") {
    return ORDEN_MODULOS_ACCESOS.filter((modulo) => usuario.modulos.includes(modulo)).map(
      (modulo) => MODULO_ACCESO_RAPIDO[modulo]!,
    );
  }
  if (usuario.rol === "SUPER_ADMIN") {
    return [ACCESO_DASHBOARD];
  }
  return [];
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
  const [modalTareasOpen, setModalTareasOpen] = useState(false);
  const [eventosProximos, setEventosProximos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [facturacion, setFacturacion] = useState<FacturacionResponse | null>(null);

  const cargarTareas = useCallback(async () => {
    if (!usuario || !tieneAccesoTareas(usuario)) return;
    try {
      const data = await apiFetch<Nota[]>("/notas/mis-tareas");
      setTareas(data);
    } catch {
      // Si falla, simplemente no se muestra el aviso — no es una acción crítica del usuario.
    }
  }, [usuario]);

  const cargarEventosProximos = useCallback(async () => {
    if (!usuario || !tieneAccesoAgenda(usuario)) {
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

  const cargarFacturacion = useCallback(async () => {
    if (!usuario || !tieneAccesoFacturacion(usuario)) return;
    try {
      const data = await apiFetch<FacturacionResponse>("/mi-iglesia/facturacion");
      setFacturacion(data);
    } catch {
      // `GET /mi-iglesia/facturacion` es de alcance MANAGER (mismo que
      // /mi-iglesia, ver frontend/prompt.md sección 7), pero el aviso de este
      // dashboard se pide también para USUARIO — si el backend responde 403
      // para ese rol, el banner simplemente no aparece en vez de romper el
      // resto del home. Contradicción señalada en FEATURES.md, no resuelta
      // en silencio.
    }
  }, [usuario]);

  useEffect(() => {
    cargarTareas();
  }, [cargarTareas]);

  useEffect(() => {
    cargarEventosProximos();
  }, [cargarEventosProximos]);

  useEffect(() => {
    cargarFacturacion();
  }, [cargarFacturacion]);

  function onTareaActualizada(tarea: Nota) {
    setTareas((prev) => (tarea.estado === "EN_REVISION" ? prev.map((t) => (t.id === tarea.id ? tarea : t)) : prev.filter((t) => t.id !== tarea.id)));
  }

  if (!ready || !usuario) {
    return null;
  }

  const fechaHoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const accesos = buildAccesos(usuario);

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

          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
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
                    width={88}
                    height={88}
                    className="h-20 w-20 rounded-full border-4 border-card object-cover shadow-md sm:h-22 sm:w-22"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-card bg-primary/15 text-primary shadow-md">
                    <Building2 className="h-9 w-9" />
                  </div>
                )}
                <p className="text-lg font-semibold text-foreground">{usuario.iglesia.nombre}</p>
                <p className="text-xs font-medium text-primary">Tu iglesia está aquí, activa y presente</p>
              </div>
            )}
          </div>
        </div>

        {facturacion && (facturacion.facturacion.color === "AMARILLO" || facturacion.facturacion.color === "ROJO") && (
          <Link
            href="/facturacion"
            className={`mt-6 flex items-center gap-4 rounded-2xl border p-5 text-left shadow-sm transition-colors ${
              facturacion.facturacion.color === "ROJO"
                ? "border-destructive/30 bg-destructive/10 hover:bg-destructive/15"
                : "border-amber-200 bg-amber-50 hover:bg-amber-100"
            }`}
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                facturacion.facturacion.color === "ROJO" ? "bg-destructive/15 text-destructive" : "bg-amber-100 text-amber-700"
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p
                className={`text-base font-semibold ${
                  facturacion.facturacion.color === "ROJO" ? "text-destructive" : "text-amber-900"
                }`}
              >
                {facturacion.facturacion.enMora
                  ? `Tu facturación está vencida hace ${facturacion.facturacion.diasEnMora} día${facturacion.facturacion.diasEnMora === 1 ? "" : "s"}`
                  : `Tu próxima facturación es en ${facturacion.facturacion.diasParaFacturacion} día${facturacion.facturacion.diasParaFacturacion === 1 ? "" : "s"}`}
              </p>
              <p className={`text-sm ${facturacion.facturacion.color === "ROJO" ? "text-destructive/80" : "text-amber-700"}`}>
                Revisa el módulo de Facturación
              </p>
            </div>
            <ArrowRight
              className={`h-5 w-5 shrink-0 ${facturacion.facturacion.color === "ROJO" ? "text-destructive" : "text-amber-700"}`}
            />
          </Link>
        )}

        {tareas.length > 0 && (
          <button
            type="button"
            onClick={() => setModalTareasOpen(true)}
            className="mt-6 flex w-full items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left shadow-sm transition-colors hover:bg-amber-100"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Bell className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-amber-900">
                Tienes {tareas.length} {tareas.length === 1 ? "tarea" : "tareas"} pendiente{tareas.length === 1 ? "" : "s"}
              </p>
              <p className="text-sm text-amber-700">Toca aquí para verlas</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-amber-700" />
          </button>
        )}

        {accesos.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-muted-foreground">Accesos rápidos</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {accesos.map((acceso) => {
                const Icon = acceso.icon;
                return (
                  <Link
                    key={acceso.href}
                    href={acceso.href}
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${acceso.tint}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-foreground">{acceso.label}</p>
                      <p className="text-sm text-muted-foreground">{acceso.descripcion}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {tieneAccesoAgenda(usuario) && <ProximosEventos eventos={eventosProximos} loading={loadingEventos} />}
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
