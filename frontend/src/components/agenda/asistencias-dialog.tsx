"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { ApiError, apiFetch } from "@/lib/api";
import { ESTADO_ASISTENCIA_CLASS, ESTADO_ASISTENCIA_LABEL, type AsistenciaResumen, type EstadoAsistencia } from "./types";

const GRUPOS: { estado: EstadoAsistencia; titulo: string }[] = [
  { estado: "CONFIRMADO", titulo: "Confirmaron" },
  { estado: "PENDIENTE", titulo: "Sin responder" },
  { estado: "RECHAZADO", titulo: "Rechazaron" },
];

interface AsistenciasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string | null;
  eventoTitulo: string;
}

export function AsistenciasDialog({ open, onOpenChange, eventoId, eventoTitulo }: AsistenciasDialogProps) {
  const [asistencias, setAsistencias] = useState<AsistenciaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !eventoId) return;
    setLoading(true);
    setError(null);

    apiFetch<AsistenciaResumen[]>(`/agenda/eventos/${eventoId}/asistencias`)
      .then(setAsistencias)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las asistencias"))
      .finally(() => setLoading(false));
  }, [open, eventoId]);

  // Realtime (ver frontend/prompt.md): un integrante respondió la convocatoria
  // desde el link del correo — parcha su fila sin recargar, solo si el diálogo
  // está abierto para ese evento. Los contadores por grupo (Confirmaron / Sin
  // responder / Rechazaron) se derivan de `asistencias` con `.filter`, así que
  // se re-renderizan solos.
  useRealtimeEvent("asistencia:respondida", (payload) => {
    if (!open || payload.eventoId !== eventoId) return;
    setAsistencias((prev) =>
      prev.map((a) =>
        a.integranteId === payload.integranteId
          ? { ...a, estado: payload.estado, respondidoAt: payload.respondidoAt }
          : a,
      ),
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asistencia — {eventoTitulo}</DialogTitle>
          <DialogDescription>Quién confirmó, rechazó o todavía no responde la convocatoria.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : asistencias.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No se convocó a ningún integrante.</p>
        ) : (
          <div className="space-y-5">
            {GRUPOS.map(({ estado, titulo }) => {
              const integrantes = asistencias.filter((a) => a.estado === estado);
              return (
                <div key={estado}>
                  <p className="text-sm font-medium text-foreground">
                    {titulo} ({integrantes.length})
                  </p>
                  {integrantes.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Nadie en este grupo.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {integrantes.map((a) => (
                        <div
                          key={a.integranteId}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{a.nombreCompleto}</p>
                            <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_ASISTENCIA_CLASS[a.estado]}`}
                          >
                            {ESTADO_ASISTENCIA_LABEL[a.estado]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
