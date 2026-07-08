"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Clock, Loader2, NotebookPen, Plus, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NotaDialog } from "@/components/notas/nota-dialog";
import type { Nota, TipoNota } from "@/components/notas/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

function formatoFechaLimite(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function estaVencida(iso: string): boolean {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(iso) < hoy;
}

function RecordatorioRow({
  nota,
  onToggle,
  onAprobar,
  onRechazar,
  onEdit,
  procesando,
}: {
  nota: Nota;
  onToggle: (nota: Nota) => void;
  onAprobar: (nota: Nota) => void;
  onRechazar: (nota: Nota) => void;
  onEdit: (nota: Nota) => void;
  procesando: boolean;
}) {
  const vencida = nota.estado === "PENDIENTE" && nota.fechaLimite !== null && estaVencida(nota.fechaLimite);

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40">
      {nota.estado === "EN_REVISION" ? (
        <div className="mt-0.5 shrink-0 text-amber-500" title="Esperando tu aprobación">
          <Clock className="h-5 w-5" />
        </div>
      ) : (
        <button
          type="button"
          aria-label={nota.estado === "COMPLETADA" ? "Marcar como pendiente" : "Marcar como completada"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(nota);
          }}
          disabled={procesando}
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
        >
          {procesando ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : nota.estado === "COMPLETADA" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
      )}

      <button type="button" className="flex-1 text-left" onClick={() => onEdit(nota)}>
        <p
          className={
            nota.estado === "COMPLETADA"
              ? "text-sm font-medium text-muted-foreground line-through"
              : "text-sm font-medium text-foreground"
          }
        >
          {nota.titulo}
        </p>
        {nota.descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{nota.descripcion}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {nota.estado === "EN_REVISION" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Marcada como hecha, esperando tu aprobación
            </span>
          )}
          {nota.fechaLimite && (
            <span
              className={
                vencida
                  ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                  : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              }
            >
              {vencida ? "Venció" : "Vence"} el {formatoFechaLimite(nota.fechaLimite)}
            </span>
          )}
          {nota.asignadoA && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
              {nota.asignadoA.nombre} {nota.asignadoA.apellido}
            </span>
          )}
        </div>
      </button>

      {nota.estado === "EN_REVISION" && (
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="outline" onClick={() => onRechazar(nota)} disabled={procesando}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => onAprobar(nota)} disabled={procesando}>
            {procesando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Aprobar
          </Button>
        </div>
      )}
    </div>
  );
}

function NotaLargaRow({ nota, onEdit }: { nota: Nota; onEdit: (nota: Nota) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(nota)}
      className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/40"
    >
      <NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">{nota.titulo}</p>
        {nota.descripcion && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{nota.descripcion}</p>}
      </div>
    </button>
  );
}

export default function NotasPage() {
  const { usuario, ready } = useRequireAuth();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [notaSeleccionada, setNotaSeleccionada] = useState<Nota | null>(null);
  const [tipoNuevo, setTipoNuevo] = useState<TipoNota>("RECORDATORIO");

  const loadNotas = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<Nota[]>("/notas", { token: accessToken });
      setNotas(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar los recordatorios");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadNotas();
  }, [loadNotas]);

  function abrirCreacion(tipo: TipoNota) {
    setTipoNuevo(tipo);
    setNotaSeleccionada(null);
    setDialogOpen(true);
  }

  function abrirEdicion(nota: Nota) {
    setNotaSeleccionada(nota);
    setDialogOpen(true);
  }

  async function actualizarEstado(nota: Nota, estado: "PENDIENTE" | "COMPLETADA") {
    if (!accessToken) return;
    setProcesandoId(nota.id);

    try {
      const actualizada = await apiFetch<Nota>(`/notas/${nota.id}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ estado }),
      });
      setNotas((prev) => prev.map((n) => (n.id === actualizada.id ? actualizada : n)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar el recordatorio");
    } finally {
      setProcesandoId(null);
    }
  }

  function toggleEstado(nota: Nota) {
    actualizarEstado(nota, nota.estado === "COMPLETADA" ? "PENDIENTE" : "COMPLETADA");
  }

  if (!ready || !usuario) {
    return null;
  }

  if (usuario.rol !== "PASTOR") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para ver esta página.</p>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </main>
    );
  }

  const recordatorios = notas.filter((n) => n.tipo === "RECORDATORIO");
  const notasLargas = notas.filter((n) => n.tipo === "NOTA");

  const pendientes = recordatorios.filter((n) => n.estado === "PENDIENTE" || n.estado === "EN_REVISION");
  const completadas = recordatorios.filter((n) => n.estado === "COMPLETADA");

  return (
    <main className="h-full bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Notas de recordatorio</h1>
            <p className="mt-1 text-sm text-muted-foreground">Uso exclusivo del pastor.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => abrirCreacion("NOTA")}>
              <NotebookPen className="h-4 w-4" />
              Nueva nota
            </Button>
            <Button onClick={() => abrirCreacion("RECORDATORIO")}>
              <Plus className="h-4 w-4" />
              Nuevo recordatorio
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Pendientes ({pendientes.length})</h2>
              {pendientes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tienes pendientes. ¡Vas al día!</p>
              ) : (
                <div className="space-y-2">
                  {pendientes.map((nota) => (
                    <RecordatorioRow
                      key={nota.id}
                      nota={nota}
                      onToggle={toggleEstado}
                      onAprobar={(n) => actualizarEstado(n, "COMPLETADA")}
                      onRechazar={(n) => actualizarEstado(n, "PENDIENTE")}
                      onEdit={abrirEdicion}
                      procesando={procesandoId === nota.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {completadas.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Completados ({completadas.length})</h2>
                <div className="space-y-2">
                  {completadas.map((nota) => (
                    <RecordatorioRow
                      key={nota.id}
                      nota={nota}
                      onToggle={toggleEstado}
                      onAprobar={(n) => actualizarEstado(n, "COMPLETADA")}
                      onRechazar={(n) => actualizarEstado(n, "PENDIENTE")}
                      onEdit={abrirEdicion}
                      procesando={procesandoId === nota.id}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Notas ({notasLargas.length})</h2>
              {notasLargas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay notas largas.</p>
              ) : (
                <div className="space-y-2">
                  {notasLargas.map((nota) => (
                    <NotaLargaRow key={nota.id} nota={nota} onEdit={abrirEdicion} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <NotaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nota={notaSeleccionada}
        defaultTipo={tipoNuevo}
        onSaved={loadNotas}
        onDeleted={loadNotas}
      />
    </main>
  );
}
