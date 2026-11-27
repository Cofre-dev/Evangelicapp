"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ApiError, apiFetch } from "@/lib/api";

interface ReportarDialogProps {
  llamadoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportarDialog({ llamadoId, open, onOpenChange }: ReportarDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    if (!motivo.trim()) {
      setError("Cuéntanos el motivo del reporte");
      return;
    }
    setEnCurso(true);
    setError(null);
    try {
      await apiFetch(`/red/llamados/${llamadoId}/reportar`, {
        method: "POST",
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      toast("Gracias, lo revisaremos.");
      setMotivo("");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast("Ya lo reportaste.");
        onOpenChange(false);
        return;
      }
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el reporte");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enCurso && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar llamado</DialogTitle>
          <DialogDescription>
            El equipo de Evangelicapp revisará el reporte. La iglesia autora no sabrá quién lo reportó.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reporte-motivo">Motivo</Label>
          <Textarea
            id="reporte-motivo"
            rows={4}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Pide dinero, contenido ofensivo, información falsa…"
          />
          <p className="text-right text-xs text-muted-foreground">{motivo.length}/500</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={enCurso}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={enviar} disabled={enCurso}>
            {enCurso ? <Loader2 className="animate-spin" /> : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
