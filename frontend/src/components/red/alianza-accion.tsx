"use client";

import { useState } from "react";
import { Check, Handshake, Loader2, X } from "lucide-react";

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
import { useRedStore } from "@/stores/red-store";
import type { AlianzaItem, EstadoAlianzaVista } from "./types";

interface AlianzaAccionProps {
  iglesiaId: string;
  nombre: string;
  alianza: EstadoAlianzaVista;
  puedeEscribir: boolean;
  onCambio: (alianza: EstadoAlianzaVista) => void;
}

/**
 * El directorio y el perfil de una iglesia traen solo el estado de la
 * relación (`alianza`), no el id de la alianza que hace falta para
 * retirar/responder. Se busca en `GET /red/alianzas` en el momento de actuar.
 */
async function buscarAlianza(iglesiaId: string, estado: AlianzaItem["estado"]): Promise<AlianzaItem | undefined> {
  const items = await apiFetch<AlianzaItem[]>(`/red/alianzas?estado=${estado}`);
  return items.find((a) => a.iglesia?.iglesiaId === iglesiaId);
}

function mensajeError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function AlianzaAccion({ iglesiaId, nombre, alianza, puedeEscribir, onCambio }: AlianzaAccionProps) {
  const cargarAlianzas = useRedStore((s) => s.cargarAlianzas);
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function solicitar() {
    setEnCurso("solicitar");
    try {
      const creada = await apiFetch<AlianzaItem>("/red/alianzas", {
        method: "POST",
        body: JSON.stringify({ iglesiaId, mensaje: mensaje.trim() || undefined }),
      });
      if (creada.estado === "ACEPTADA") {
        onCambio("ACEPTADA");
        toast(`${nombre} ya te había pedido una alianza: ahora son aliadas.`);
      } else {
        onCambio("PENDIENTE_ENVIADA");
        toast(`Solicitud enviada a ${nombre}.`);
      }
      setDialogAbierto(false);
      setMensaje("");
      void cargarAlianzas();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo enviar la solicitud"));
    } finally {
      setEnCurso(null);
    }
  }

  async function retirar() {
    setEnCurso("retirar");
    try {
      const item = await buscarAlianza(iglesiaId, "PENDIENTE");
      if (!item) throw new ApiError(404, "La solicitud ya no existe.");
      await apiFetch(`/red/alianzas/${item.id}`, { method: "DELETE" });
      onCambio(null);
      toast("Solicitud retirada.");
      void cargarAlianzas();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo retirar la solicitud"));
    } finally {
      setEnCurso(null);
    }
  }

  async function responder(aceptar: boolean) {
    setEnCurso(aceptar ? "aceptar" : "rechazar");
    try {
      const item = await buscarAlianza(iglesiaId, "PENDIENTE");
      if (!item) throw new ApiError(404, "La solicitud ya no existe.");
      await apiFetch(`/red/alianzas/${item.id}/responder`, {
        method: "POST",
        body: JSON.stringify({ aceptar }),
      });
      onCambio(aceptar ? "ACEPTADA" : "RECHAZADA");
      toast(aceptar ? `Ahora ${nombre} es una iglesia aliada.` : "Solicitud rechazada.");
      void cargarAlianzas();
    } catch (err) {
      toast.error(mensajeError(err, "No se pudo responder la solicitud"));
    } finally {
      setEnCurso(null);
    }
  }

  if (alianza === "ACEPTADA") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Handshake className="h-3.5 w-3.5" aria-hidden />
        Aliada
      </span>
    );
  }

  if (alianza === "PENDIENTE_ENVIADA") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
          Solicitud enviada
        </span>
        {puedeEscribir && (
          <Button type="button" size="sm" variant="ghost" onClick={retirar} disabled={enCurso !== null}>
            {enCurso === "retirar" ? <Loader2 className="animate-spin" /> : "Retirar"}
          </Button>
        )}
      </div>
    );
  }

  if (alianza === "PENDIENTE_RECIBIDA") {
    if (!puedeEscribir) {
      return (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
          Te pidió una alianza
        </span>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => responder(true)} disabled={enCurso !== null}>
          {enCurso === "aceptar" ? <Loader2 className="animate-spin" /> : <Check aria-hidden />}
          Aceptar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => responder(false)} disabled={enCurso !== null}>
          {enCurso === "rechazar" ? <Loader2 className="animate-spin" /> : <X aria-hidden />}
          Rechazar
        </Button>
      </div>
    );
  }

  // null o RECHAZADA
  if (!puedeEscribir) return null;

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setDialogAbierto(true)}>
        <Handshake aria-hidden />
        Solicitar alianza
      </Button>
      <Dialog open={dialogAbierto} onOpenChange={(o) => enCurso === null && setDialogAbierto(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar alianza</DialogTitle>
            <DialogDescription>
              Si {nombre} acepta, podrán ver los llamados &ldquo;Solo aliadas&rdquo; de la otra iglesia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`mensaje-alianza-${iglesiaId}`}>Mensaje (opcional)</Label>
            <Textarea
              id={`mensaje-alianza-${iglesiaId}`}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Somos vecinos de comuna y nos gustaría apoyarnos en las acciones sociales."
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogAbierto(false)} disabled={enCurso !== null}>
              Cancelar
            </Button>
            <Button type="button" onClick={solicitar} disabled={enCurso !== null}>
              {enCurso === "solicitar" ? <Loader2 className="animate-spin" /> : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
