"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EventoDialog } from "@/components/agenda/evento-dialog";
import { MonthCalendar } from "@/components/agenda/month-calendar";
import type { Evento } from "@/components/agenda/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";
import type { SessionUser } from "@/stores/auth-store";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// AGENDA es uno de los 4 módulos delegables (ver frontend/prompt.md): el
// MANAGER siempre tiene acceso; un USUARIO solo si el MANAGER se lo otorgó
// desde /accesos.
function tieneAccesoAgenda(usuario: SessionUser): boolean {
  return usuario.rol === "MANAGER" || usuario.modulos.includes("AGENDA");
}

export default function AgendaPage() {
  const { usuario, ready } = useRequireAuth();

  const [mes, setMes] = useState(() => new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>();

  const loadEventos = useCallback(async () => {
    if (!usuario) return;
    setLoading(true);
    setError(null);

    const from = new Date(mes.getFullYear(), mes.getMonth(), 1 - 7);
    const to = new Date(mes.getFullYear(), mes.getMonth() + 1, 7);

    try {
      const data = await apiFetch<Evento[]>(`/agenda/eventos?from=${from.toISOString()}&to=${to.toISOString()}`);
      setEventos(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la agenda");
    } finally {
      setLoading(false);
    }
  }, [usuario, mes]);

  useEffect(() => {
    loadEventos();
  }, [loadEventos]);

  function abrirCreacion(fecha: Date) {
    setEventoSeleccionado(null);
    setFechaSeleccionada(fecha);
    setDialogOpen(true);
  }

  function abrirEdicion(evento: Evento) {
    setEventoSeleccionado(evento);
    setFechaSeleccionada(undefined);
    setDialogOpen(true);
  }

  if (!ready || !usuario) {
    return null;
  }

  if (!tieneAccesoAgenda(usuario)) {
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
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
            <p className="mt-1 text-sm text-muted-foreground">Cultos, reuniones y actividades de la iglesia.</p>
          </div>
          <Button onClick={() => abrirCreacion(new Date())}>
            <Plus className="h-4 w-4" />
            Nuevo evento
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-48 text-center text-sm font-medium text-foreground">
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </p>
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando agenda...
            </div>
          ) : (
            <MonthCalendar mes={mes} eventos={eventos} onDayClick={abrirCreacion} onEventoClick={abrirEdicion} />
          )}
        </div>
      </div>

      <EventoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={fechaSeleccionada}
        evento={eventoSeleccionado}
        eventosExistentes={eventos}
        onSaved={loadEventos}
        onDeleted={loadEventos}
      />
    </main>
  );
}
