"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";

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

const MOTIVO_MIN = 10;

interface EliminarIglesiaDialogProps {
  iglesiaId: string;
  iglesiaNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Borrado PERMANENTE de una iglesia (`POST /iglesias/:id/eliminar`). Irreversible:
 * pide el motivo (va textual en el correo de despedida al pastor) y que el
 * SuperAdmin tipee el nombre exacto de la iglesia. El backend vuelve a validar ambos.
 */
export function EliminarIglesiaDialog({ iglesiaId, iglesiaNombre, open, onOpenChange }: EliminarIglesiaDialogProps) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [nombre, setNombre] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setNombre("");
    setError(null);
  }, [open]);

  const nombreCoincide = nombre.trim() === iglesiaNombre.trim();
  const motivoValido = motivo.trim().length >= MOTIVO_MIN;

  async function eliminar() {
    if (!nombreCoincide || !motivoValido) return;
    setEnCurso(true);
    setError(null);
    try {
      const res = await apiFetch<{ ok: true; correosEnviados: number }>(`/iglesias/${iglesiaId}/eliminar`, {
        method: "POST",
        body: JSON.stringify({ motivo: motivo.trim(), confirmacionNombre: nombre.trim() }),
      });
      toast(
        res.correosEnviados > 0
          ? `${iglesiaNombre} fue eliminada. Le avisamos por correo al pastor.`
          : `${iglesiaNombre} fue eliminada. No se pudo enviar el correo al pastor.`,
      );
      onOpenChange(false);
      router.replace("/superadmin/iglesias");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar la iglesia");
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !enCurso && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>Eliminar iglesia permanentemente</DialogTitle>
          <DialogDescription>
            Se borrarán <strong className="font-medium text-foreground">{iglesiaNombre}</strong>, su equipo,
            integrantes, finanzas, agenda, certificados y todo lo que tenga en la Red de iglesias.{" "}
            <strong className="font-medium text-destructive">Esta acción no se puede deshacer.</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eliminar-motivo">Motivo</Label>
            <Textarea
              id="eliminar-motivo"
              rows={4}
              maxLength={1000}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: la iglesia solicitó dar de baja su cuenta."
            />
            <p className="text-xs text-muted-foreground">
              Se incluye tal cual en el correo de despedida que recibe el pastor.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eliminar-nombre">
              Para confirmar, escribe <span className="font-semibold text-foreground">{iglesiaNombre}</span>
            </Label>
            <Input
              id="eliminar-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="off"
              spellCheck={false}
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
          <Button
            type="button"
            variant="destructive"
            onClick={eliminar}
            disabled={enCurso || !nombreCoincide || !motivoValido}
          >
            {enCurso ? <Loader2 className="animate-spin" /> : "Eliminar para siempre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
