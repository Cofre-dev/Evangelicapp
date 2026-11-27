"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: string;
  confirmarLabel: string;
  destructivo?: boolean;
  /** Si lanza, el diálogo queda abierto (el llamador muestra el error). */
  onConfirmar: () => Promise<void>;
}

/** "AlertDialog" hecho con el `Dialog` existente (no está
 * `@radix-ui/react-alert-dialog`, mismo criterio que el reporte financiero). */
export function ConfirmarDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  confirmarLabel,
  destructivo,
  onConfirmar,
}: ConfirmarDialogProps) {
  const [enCurso, setEnCurso] = useState(false);

  async function confirmar() {
    setEnCurso(true);
    try {
      await onConfirmar();
      onOpenChange(false);
    } catch {
      // El llamador ya mostró el error.
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enCurso && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={enCurso}>
            Volver
          </Button>
          <Button
            type="button"
            variant={destructivo ? "destructive" : "default"}
            onClick={confirmar}
            disabled={enCurso}
          >
            {enCurso ? <Loader2 className="animate-spin" /> : confirmarLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
