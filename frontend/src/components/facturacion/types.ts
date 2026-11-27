import type { EstadoFacturacion, LimitesIglesia, PlanIglesia } from "@/components/iglesias/types";

export interface FacturacionResponse {
  id: string;
  nombre: string;
  estado: "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
  plan: PlanIglesia;
  /** `null` en plan GRATUITO (no hay semáforo ni fecha de cobro). */
  facturacion: EstadoFacturacion | null;
  /** Con valor: la iglesia está en GRATUITO por mora y este es el plan que
   * recupera cuando el SuperAdmin confirma el pago. */
  planPrevioMora: PlanIglesia | null;
  limites: LimitesIglesia;
}
