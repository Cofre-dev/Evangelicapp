"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FacturacionResponse } from "@/components/facturacion/types";
import { PLAN_LABEL } from "@/components/iglesias/types";
import { apiFetch } from "@/lib/api";
import { useAuthStore, type Rol } from "@/stores/auth-store";

/** Mismo alcance que el resto de facturación del lado iglesia (ver
 * frontend/prompt.md sección 4 y la nota de alcance en FEATURES.md 2026-08-03). */
function tieneAccesoFacturacion(rol: Rol): boolean {
  return rol === "MANAGER" || rol === "USUARIO";
}

/**
 * Modal (solo el día que vence la facturación, `diasParaFacturacion === 0`)
 * + banner persistente (mientras la iglesia esté en mora) — montado una vez
 * en el shell autenticado (`app-shell.tsx`) para sobrevivir a la navegación
 * entre páginas dentro de la misma sesión de la app. Antes el modal avisaba
 * con hasta 3 días de anticipación; se acotó a solo el día del vencimiento
 * porque el aviso anticipado resultaba molesto (ver frontend/prompt.md). El
 * cierre del modal se guarda solo en memoria (no en localStorage a propósito,
 * ver frontend/prompt.md): un refresh completo o volver a abrir la app lo
 * vuelve a mostrar mientras la fecha real siga vigente.
 */
export function FacturacionAlertas() {
  const usuario = useAuthStore((state) => state.usuario);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [data, setData] = useState<FacturacionResponse | null>(null);
  const [modalCerrado, setModalCerrado] = useState(false);

  // Depende del plan además del usuario: si cambia con la sesión abierta
  // (mora → gratuito, o el SuperAdmin restaura el plan) se vuelve a pedir.
  const usuarioId = usuario?.id;
  const rol = usuario?.rol;
  const plan = usuario?.iglesia?.plan;

  useEffect(() => {
    if (!hasHydrated || !usuarioId || !rol || !tieneAccesoFacturacion(rol)) {
      setData(null);
      return;
    }
    apiFetch<FacturacionResponse>("/mi-iglesia/facturacion")
      .then(setData)
      .catch(() => {
        // Alerta informativa, no crítica: si falla, simplemente no se muestra.
      });
  }, [hasHydrated, usuarioId, rol, plan]);

  if (!data) return null;

  // Plan GRATUITO: no hay facturación (`null`). Si bajó a gratuito por mora,
  // `planPrevioMora` trae el plan que recupera al pagar → banner ámbar en
  // todas las pantallas del shell.
  const { planPrevioMora } = data;
  const diasParaFacturacion = data.facturacion?.diasParaFacturacion ?? null;
  const enMora = data.facturacion?.enMora ?? false;
  const diasEnMora = data.facturacion?.diasEnMora ?? 0;
  const mostrarModal = !enMora && diasParaFacturacion === 0 && !modalCerrado;

  return (
    <>
      {planPrevioMora && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-800 sm:px-8">
          Tu iglesia pasó al plan gratuito por una mensualidad pendiente. Tus datos están guardados: al ponerte al día
          recuperas el plan {PLAN_LABEL[planPrevioMora]}.
        </div>
      )}

      {enMora && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-center text-sm font-medium text-destructive sm:px-8">
          Tu facturación venció hace {diasEnMora} día{diasEnMora === 1 ? "" : "s"}. Ponte al día: a los 3 días tu iglesia
          pasa al plan gratuito y solo conserva la Red de iglesias.
        </div>
      )}

      <Dialog open={mostrarModal} onOpenChange={(open) => !open && setModalCerrado(true)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recordatorio de facturación</DialogTitle>
            <DialogDescription>
              Tu facturación vence hoy. Para que tu equipo no pierda acceso, ponte al día hoy mismo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={() => setModalCerrado(true)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
