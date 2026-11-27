"use client";

import Link from "next/link";
import { Check, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTACTO_EMAIL } from "@/components/iglesias/types";
import { useUpsellStore } from "@/stores/upsell-store";

const DESBLOQUEA = [
  "Agenda y convocatorias",
  "Finanzas",
  "Ceremonias y certificados",
  "Integrantes y registro por QR",
  "Notas y tareas",
  "Equipo y accesos",
  "Reporte financiero a la congregación",
];

const ASUNTO_VENTAS = "Quiero contratar un plan de pago";

function UpsellCuerpo({ onNavegar }: { onNavegar?: () => void }) {
  return (
    <>
      <ul className="space-y-2 text-sm text-foreground">
        {DESBLOQUEA.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/facturacion" onClick={onNavegar}>
            Ver planes
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <a href={`mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(ASUNTO_VENTAS)}`}>
            <Mail aria-hidden />
            Contactar a ventas
          </a>
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">La Red de iglesias sigue disponible en tu plan actual.</p>
    </>
  );
}

/** Modal global, montado una vez en el shell. Lo abren el handler del 403
 * `REQUIERE_PLAN_PAGO` (`apiFetch`) y los ítems con candado del menú. */
export function UpsellPlanDialog() {
  const abierto = useUpsellStore((s) => s.abierto);
  const cerrar = useUpsellStore((s) => s.cerrar);

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>Disponible en los planes de pago</DialogTitle>
          <DialogDescription>Tu iglesia está en el plan Gratuito. Con un plan de pago desbloqueas:</DialogDescription>
        </DialogHeader>
        <UpsellCuerpo onNavegar={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

/** Versión pantalla completa: la usa el gate de plan del shell cuando una
 * iglesia GRATUITO entra por URL a un módulo de pago. */
export function UpsellPlanPantalla() {
  return (
    <main className="flex h-full items-start justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Disponible en los planes de pago</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu iglesia está en el plan Gratuito. Con un plan de pago desbloqueas:
        </p>
        <div className="mt-5">
          <UpsellCuerpo />
        </div>
        <Link href="/red" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Ir a la Red de iglesias
        </Link>
      </div>
    </main>
  );
}
