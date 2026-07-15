"use client";

import Link from "next/link";
import { CalendarDays, Loader2 } from "lucide-react";

import { TIPO_EVENTO_CHIP_CLASS, TIPO_EVENTO_LABEL, type Evento } from "./types";

function formatoDiaCorto(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "");
}

function formatoHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

/** Countdown simple del evento más próximo, calculado 100% en cliente sobre datos ya cargados. */
function formatoCountdown(evento: Evento): string {
  const ahora = new Date();
  const inicio = new Date(evento.fechaInicio);
  const fin = new Date(evento.fechaFin);
  const horaTexto = formatoHora(evento.fechaInicio);

  if (ahora >= inicio && ahora <= fin) return "En curso ahora";

  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const diaInicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const diffDias = Math.round((diaInicio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return `Hoy a las ${horaTexto}`;
  if (diffDias === 1) return `Mañana a las ${horaTexto}`;
  return `Faltan ${diffDias} días`;
}

interface ProximosEventosProps {
  eventos: Evento[];
  loading: boolean;
}

export function ProximosEventos({ eventos, loading }: ProximosEventosProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Próximos eventos</h2>
          {!loading && eventos.length > 0 && (
            <p className="mt-0.5 text-xs font-medium text-primary">{formatoCountdown(eventos[0])}</p>
          )}
        </div>
        <Link href="/agenda" className="text-sm font-medium text-primary hover:underline">
          Ver agenda
        </Link>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : eventos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay eventos programados en los próximos 30 días.</p>
            <Link href="/agenda" className="text-sm font-medium text-primary hover:underline">
              Agendar uno
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {eventos.map((evento, i) => (
              <li
                key={evento.id}
                className="flex animate-in items-center gap-4 fade-in slide-in-from-bottom-1 p-4 duration-300"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-muted py-2">
                  <span className="text-[11px] font-medium uppercase text-muted-foreground">
                    {formatoDiaCorto(evento.fechaInicio)}
                  </span>
                  <span className="text-lg font-semibold text-foreground">{new Date(evento.fechaInicio).getDate()}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{evento.titulo}</p>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TIPO_EVENTO_CHIP_CLASS[evento.tipo]}`}
                    >
                      {TIPO_EVENTO_LABEL[evento.tipo]}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatoHora(evento.fechaInicio)} – {formatoHora(evento.fechaFin)}
                    {evento.ubicacion && ` · ${evento.ubicacion}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
