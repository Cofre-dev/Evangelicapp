import Link from "next/link";
import { CalendarDays, EyeOff, HeartHandshake, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import { cn } from "@/lib/utils";
import { formatRangoOperativo, formatRelativo, pluralIglesias } from "./format";
import {
  ESTADO_LLAMADO_CLASSES,
  ESTADO_LLAMADO_LABEL,
  TIPO_LLAMADO_LABEL,
  type EstadoLlamado,
  type LlamadoResumen,
  type ProgresoNecesidad,
} from "./types";
import { VerificadaBadge } from "./verificada-badge";

export function EstadoLlamadoBadge({ estado }: { estado: EstadoLlamado }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", ESTADO_LLAMADO_CLASSES[estado])}>
      {ESTADO_LLAMADO_LABEL[estado]}
    </span>
  );
}

/** Progreso de una necesidad tal como lo devuelve el backend — el frontend
 * nunca recalcula `comprometido` ni `cubierta`. */
export function ProgresoNecesidadItem({ necesidad }: { necesidad: ProgresoNecesidad }) {
  const { descripcion, cantidadMeta, comprometido, unidad, iglesias, cubierta } = necesidad;
  const tieneMeta = cantidadMeta !== null && cantidadMeta > 0;
  const porcentaje = tieneMeta ? Math.min(100, Math.round((comprometido / cantidadMeta) * 100)) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="min-w-0 truncate text-foreground">{descripcion}</p>
        <p className={cn("shrink-0 tabular-nums", cubierta ? "font-medium text-emerald-700" : "text-muted-foreground")}>
          {tieneMeta
            ? `${comprometido.toLocaleString("es-CL")}/${cantidadMeta.toLocaleString("es-CL")}${unidad ? ` ${unidad}` : ""}`
            : `${pluralIglesias(iglesias)} apoyando`}
        </p>
      </div>
      {tieneMeta && (
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={cantidadMeta}
          aria-valuenow={Math.min(comprometido, cantidadMeta)}
          aria-label={`${descripcion}: ${comprometido} de ${cantidadMeta}`}
        >
          <div
            className={cn("h-full rounded-full transition-all", cubierta ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface LlamadoCardProps {
  llamado: LlamadoResumen;
  /** Máximo de necesidades a mostrar (3 en listados; todas en el detalle). */
  maxNecesidades?: number;
  /** Acciones extra en el pie (ej. Cerrar/Reabrir en "Mis llamados"). */
  acciones?: React.ReactNode;
}

/** Tarjeta de llamado de ayuda, reutilizada en el feed, Mis llamados y el
 * perfil de una iglesia. */
export function LlamadoCard({ llamado, maxNecesidades = 3, acciones }: LlamadoCardProps) {
  const necesidades = [...llamado.necesidades].sort((a, b) => a.orden - b.orden);
  const visibles = necesidades.slice(0, maxNecesidades);
  const rango = formatRangoOperativo(llamado.fechaInicio, llamado.fechaFin);

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        {llamado.iglesia ? (
          <IglesiaLogo logoUrl={llamado.iglesia.logoUrl} nombre={llamado.iglesia.nombre} size={36} />
        ) : (
          <IglesiaLogo logoUrl={null} nombre="" size={36} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {llamado.iglesia && !llamado.esPropio ? (
              <Link
                href={`/red/iglesias/${llamado.iglesia.iglesiaId}`}
                className="truncate text-sm font-medium text-foreground hover:underline"
              >
                {llamado.iglesia.nombre}
              </Link>
            ) : (
              <p className="truncate text-sm font-medium text-foreground">
                {llamado.esPropio ? "Tu iglesia" : (llamado.iglesia?.nombre ?? "Iglesia")}
              </p>
            )}
            {llamado.iglesia && !llamado.esPropio && <VerificadaBadge verificada={llamado.iglesia.verificada} />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {llamado.comuna} · {formatRelativo(llamado.createdAt)}
          </p>
        </div>
      </header>

      {llamado.ocultoModeracion && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
          <EyeOff className="h-3.5 w-3.5" aria-hidden />
          Oculto por moderación
        </p>
      )}

      <div className="mt-3">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          <Link href={`/red/llamados/${llamado.id}`} className="hover:underline">
            {llamado.titulo}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
            {TIPO_LLAMADO_LABEL[llamado.tipo]}
          </span>
          <EstadoLlamadoBadge estado={llamado.estado} />
          {rango && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {rango}
            </span>
          )}
          {llamado.direccion && (
            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{llamado.direccion}</span>
            </span>
          )}
        </div>
      </div>

      {visibles.length > 0 && (
        <div className="mt-4 space-y-3">
          {visibles.map((n) => (
            <ProgresoNecesidadItem key={n.id} necesidad={n} />
          ))}
          {necesidades.length > visibles.length && (
            <p className="text-xs text-muted-foreground">
              y {necesidades.length - visibles.length} necesidad{necesidades.length - visibles.length === 1 ? "" : "es"}{" "}
              más
            </p>
          )}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HeartHandshake className="h-4 w-4" aria-hidden />
            {pluralIglesias(llamado.iglesiasApoyando)} apoyando
          </span>
          {llamado.yoApoyo && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
              Tu iglesia apoya
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {acciones}
          {llamado.esPropio || llamado.estado === "CERRADO" ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/red/llamados/${llamado.id}`}>Ver</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={`/red/llamados/${llamado.id}`}>Ver y ayudar</Link>
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
