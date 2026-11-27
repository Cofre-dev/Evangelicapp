import { create } from "zustand";

/**
 * Modal global "Disponible en los planes de pago" (ver
 * `src/components/red/upsell-plan.tsx`). Lo abren:
 * - `apiFetch` al recibir un 403 `REQUIERE_PLAN_PAGO` (plan GRATUITO llamando
 *   a un módulo de pago — ej. la iglesia bajó a gratuito por mora con la
 *   sesión abierta);
 * - los ítems con candado del menú.
 * Sin `persist`: es estado de UI puro.
 */
interface UpsellState {
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
}

export const useUpsellStore = create<UpsellState>((set) => ({
  abierto: false,
  abrir: () => set({ abierto: true }),
  cerrar: () => set({ abierto: false }),
}));
