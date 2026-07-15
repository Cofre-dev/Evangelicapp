"use client";

import { TIPO_EVENTO_CHIP_CLASS, TIPO_EVENTO_DOT_CLASS, type Evento } from "./types";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const start = new Date(year, month, 1 - startWeekday);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface MonthCalendarProps {
  /** Cualquier fecha dentro del mes que se debe mostrar. */
  mes: Date;
  eventos: Evento[];
  onDayClick: (date: Date) => void;
  onEventoClick: (evento: Evento) => void;
}

export function MonthCalendar({ mes, eventos, onDayClick, onEventoClick }: MonthCalendarProps) {
  const dias = buildMonthGrid(mes.getFullYear(), mes.getMonth());
  const hoy = new Date();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia, i) => {
          const enMesActual = dia.getMonth() === mes.getMonth();
          const esHoy = isSameDay(dia, hoy);
          const eventosDelDia = eventos.filter((e) => isSameDay(new Date(e.fechaInicio), dia));

          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(dia)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick(dia);
                }
              }}
              className={[
                "flex min-h-[64px] cursor-pointer flex-col items-stretch gap-1 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/50 sm:min-h-[96px]",
                i % 7 === 6 ? "border-r-0" : "",
                enMesActual ? "" : "bg-muted/30",
              ].join(" ")}
            >
              <span
                className={
                  esHoy
                    ? "flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                    : `flex h-7 w-7 items-center justify-center text-xs font-medium ${enMesActual ? "text-foreground" : "text-muted-foreground"}`
                }
              >
                {dia.getDate()}
              </span>

              {/* En mobile, puntos de densidad reemplazan los chips (ilegibles en ~40-45px de ancho de
                  columna) pero siguen siendo tocables para abrir el evento — desktop conserva el chip completo. */}
              {eventosDelDia.length > 0 && (
                <span className="flex flex-wrap items-center gap-0.5 sm:hidden">
                  {eventosDelDia.slice(0, 4).map((evento) => (
                    <button
                      key={evento.id}
                      type="button"
                      aria-label={evento.titulo}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventoClick(evento);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onEventoClick(evento);
                        }
                      }}
                      className="flex h-4 w-4 items-center justify-center"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${TIPO_EVENTO_DOT_CLASS[evento.tipo]}`} />
                    </button>
                  ))}
                </span>
              )}

              <div className="hidden flex-col gap-1 sm:flex">
                {eventosDelDia.slice(0, 3).map((evento) => (
                  <button
                    key={evento.id}
                    type="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventoClick(evento);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onEventoClick(evento);
                      }
                    }}
                    className={`truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium ${TIPO_EVENTO_CHIP_CLASS[evento.tipo]}`}
                  >
                    {evento.titulo}
                  </button>
                ))}
                {eventosDelDia.length > 3 && (
                  <span className="text-[11px] text-muted-foreground">+{eventosDelDia.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
