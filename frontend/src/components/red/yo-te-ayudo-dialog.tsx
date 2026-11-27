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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiError, apiFetch } from "@/lib/api";
import type { LlamadoDetalle } from "./types";

// Radix Select no admite value="" — sentinel para "Apoyo general".
const GENERAL = "__general__";

interface YoTeAyudoDialogProps {
  llamado: LlamadoDetalle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Necesidad preseleccionada al abrir (o `null` = apoyo general). */
  necesidadInicial?: string | null;
  onActualizado: (llamado: LlamadoDetalle) => void;
}

/**
 * "¡Yo te ayudo!": compromiso de mi iglesia con una necesidad (o apoyo
 * general). Repetirlo sobre la misma necesidad actualiza cantidad/mensaje en
 * el backend (no duplica), así que si ya existe se precarga y el botón dice
 * "Actualizar mi apoyo".
 */
export function YoTeAyudoDialog({ llamado, open, onOpenChange, necesidadInicial, onActualizado }: YoTeAyudoDialogProps) {
  const necesidades = [...llamado.necesidades].sort((a, b) => a.orden - b.orden);
  const [seleccion, setSeleccion] = useState<string>(GENERAL);
  const [cantidad, setCantidad] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const necesidadId = seleccion === GENERAL ? null : seleccion;
  const necesidad = necesidades.find((n) => n.id === necesidadId) ?? null;
  const existente = llamado.compromisos.find((c) => c.esPropio && c.necesidadId === necesidadId) ?? null;

  function precargar(sel: string) {
    const id = sel === GENERAL ? null : sel;
    const previo = llamado.compromisos.find((c) => c.esPropio && c.necesidadId === id);
    setCantidad(previo?.cantidad != null ? String(previo.cantidad) : "");
    setMensaje(previo?.mensaje ?? "");
  }

  useEffect(() => {
    if (!open) return;
    const inicial = necesidadInicial ?? (necesidades.length > 0 ? necesidades[0].id : GENERAL);
    setSeleccion(inicial);
    precargar(inicial);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cantidadInvalida = cantidad !== "" && !(/^\d+$/.test(cantidad) && Number(cantidad) >= 1);

  async function enviar() {
    if (cantidadInvalida) return;
    setEnCurso(true);
    setError(null);
    try {
      const actualizado = await apiFetch<LlamadoDetalle>(`/red/llamados/${llamado.id}/compromisos`, {
        method: "POST",
        body: JSON.stringify({
          necesidadId: necesidadId ?? undefined,
          cantidad: cantidad ? Number(cantidad) : undefined,
          mensaje: mensaje.trim() || undefined,
        }),
      });
      onActualizado(actualizado);
      onOpenChange(false);
      toast(`¡Gracias! ${llamado.iglesia?.nombre ?? "La iglesia"} fue avisada.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar tu apoyo");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enCurso && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¡Yo te ayudo!</DialogTitle>
          <DialogDescription>
            Comprométete con una necesidad concreta. {llamado.iglesia?.nombre ?? "La iglesia"} recibirá un aviso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ayuda-necesidad">¿Con qué ayudas?</Label>
            <Select
              value={seleccion}
              onValueChange={(v) => {
                setSeleccion(v);
                precargar(v);
              }}
            >
              <SelectTrigger id="ayuda-necesidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {necesidades.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.descripcion}
                    {n.cubierta ? " (cubierta)" : ""}
                  </SelectItem>
                ))}
                <SelectItem value={GENERAL}>Apoyo general al llamado</SelectItem>
              </SelectContent>
            </Select>
            {necesidad && necesidad.cantidadMeta !== null && (
              <p className="text-xs text-muted-foreground">
                Llevan {necesidad.comprometido.toLocaleString("es-CL")} de {necesidad.cantidadMeta.toLocaleString("es-CL")}
                {necesidad.unidad ? ` ${necesidad.unidad}` : ""}.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ayuda-cantidad">
              Cantidad (opcional){necesidad?.unidad ? ` · ${necesidad.unidad}` : ""}
            </Label>
            <Input
              id="ayuda-cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              aria-invalid={cantidadInvalida}
            />
            {cantidadInvalida && (
              <p className="text-xs font-medium text-destructive">Debe ser un número entero mayor a 0</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ayuda-mensaje">Mensaje (opcional)</Label>
            <Textarea
              id="ayuda-mensaje"
              rows={3}
              maxLength={500}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Llevamos 6 voluntarios el sábado en la mañana."
            />
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
          <Button type="button" onClick={enviar} disabled={enCurso || cantidadInvalida}>
            {enCurso ? <Loader2 className="animate-spin" /> : existente ? "Actualizar mi apoyo" : "Confirmar apoyo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
