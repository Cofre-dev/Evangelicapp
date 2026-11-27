"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiError, apiFetch } from "@/lib/api";
import { fechaInputAIso, isoAFechaInput } from "./format";
import type { LlamadoDetalle } from "./types";

interface EditarLlamadoDialogProps {
  llamado: LlamadoDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: (llamado: LlamadoDetalle) => void;
}

/** `PATCH /red/llamados/:id`: textos, dirección y fechas. Las necesidades, la
 * comuna y la visibilidad no se editan (contrato del backend). */
export function EditarLlamadoDialog({ llamado, open, onOpenChange, onActualizado }: EditarLlamadoDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitulo(llamado.titulo);
    setDescripcion(llamado.descripcion);
    setDireccion(llamado.direccion ?? "");
    setFechaInicio(isoAFechaInput(llamado.fechaInicio));
    setFechaFin(isoAFechaInput(llamado.fechaFin));
    setError(null);
  }, [open, llamado]);

  async function guardar() {
    if (!titulo.trim() || !descripcion.trim()) {
      setError("El título y la descripción son obligatorios");
      return;
    }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      setError("La fecha de término no puede ser anterior a la de inicio");
      return;
    }
    setEnCurso(true);
    setError(null);
    try {
      const actualizado = await apiFetch<LlamadoDetalle>(`/red/llamados/${llamado.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          // Vacío: `null` solo si antes tenía valor (borrarlo); si ya estaba
          // vacío, se omite para no mandar campos que no cambiaron.
          direccion: direccion.trim() || (llamado.direccion ? null : undefined),
          fechaInicio: fechaInputAIso(fechaInicio) ?? (llamado.fechaInicio ? null : undefined),
          fechaFin: fechaInputAIso(fechaFin) ?? (llamado.fechaFin ? null : undefined),
        }),
      });
      onActualizado(actualizado);
      onOpenChange(false);
      toast("Llamado actualizado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el llamado");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enCurso && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar llamado</DialogTitle>
          <DialogDescription>Las necesidades no se pueden editar después de publicar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editar-titulo">Título</Label>
            <Input id="editar-titulo" maxLength={150} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editar-descripcion">Descripción</Label>
            <Textarea
              id="editar-descripcion"
              rows={5}
              maxLength={3000}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editar-direccion">Dirección (opcional)</Label>
            <Input
              id="editar-direccion"
              maxLength={200}
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="editar-inicio">Inicio (opcional)</Label>
              <Input id="editar-inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editar-fin">Término (opcional)</Label>
              <Input
                id="editar-fin"
                type="date"
                min={fechaInicio || undefined}
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={enCurso}>
            Cancelar
          </Button>
          <Button type="button" onClick={guardar} disabled={enCurso}>
            {enCurso ? <Loader2 className="animate-spin" /> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
