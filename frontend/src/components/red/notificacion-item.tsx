import {
  BadgeCheck,
  Bell,
  CheckCircle2,
  Handshake,
  HeartHandshake,
  HeartOff,
  Megaphone,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativo } from "./format";
import type { Notificacion, TipoNotificacion } from "./types";

const ICONO: Record<TipoNotificacion, LucideIcon> = {
  LLAMADO_NUEVO: Megaphone,
  COMPROMISO_NUEVO: HeartHandshake,
  COMPROMISO_CANCELADO: HeartOff,
  LLAMADO_CUBIERTO: CheckCircle2,
  ALIANZA_SOLICITADA: Handshake,
  ALIANZA_ACEPTADA: Handshake,
  IGLESIA_VERIFICADA: BadgeCheck,
  PLAN_DEGRADADO: TriangleAlert,
};

const ICONO_CLASSES: Partial<Record<TipoNotificacion, string>> = {
  LLAMADO_CUBIERTO: "bg-emerald-100 text-emerald-700",
  IGLESIA_VERIFICADA: "bg-sky-100 text-sky-700",
  PLAN_DEGRADADO: "bg-amber-100 text-amber-700",
  COMPROMISO_CANCELADO: "bg-muted text-muted-foreground",
};

/** Fila de notificación (campana y página `/notificaciones`). */
export function NotificacionItem({ notificacion, onClick }: { notificacion: Notificacion; onClick: () => void }) {
  const Icono = ICONO[notificacion.tipo] ?? Bell;
  const noLeida = notificacion.leidaEn === null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent/60",
        noLeida && "bg-accent/40",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          ICONO_CLASSES[notificacion.tipo] ?? "bg-primary/10 text-primary",
        )}
      >
        <Icono className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn("text-sm text-foreground", noLeida && "font-semibold")}>{notificacion.titulo}</span>
          {noLeida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="No leída" />}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{notificacion.mensaje}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{formatRelativo(notificacion.createdAt)}</span>
      </span>
    </button>
  );
}
