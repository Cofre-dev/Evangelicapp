export type PlanIglesia = "BASICO" | "MEDIO" | "PRO";

export const PLAN_LABEL: Record<PlanIglesia, string> = {
  BASICO: "Básico",
  MEDIO: "Medio",
  PRO: "Pro",
};

export const PLAN_LIMITES: Record<PlanIglesia, { usuarios: number; departamentos: number }> = {
  BASICO: { usuarios: 3, departamentos: 0 },
  MEDIO: { usuarios: 8, departamentos: 0 },
  PRO: { usuarios: 15, departamentos: 10 },
};

export function planTieneSubdepartamentos(plan: PlanIglesia): boolean {
  return PLAN_LIMITES[plan].departamentos > 0;
}

export const PLAN_BADGE_CLASSES: Record<PlanIglesia, string> = {
  BASICO: "bg-slate-100 text-slate-700",
  MEDIO: "bg-sky-100 text-sky-700",
  PRO: "bg-violet-100 text-violet-700",
};

/** Ver backend/src/common/utils/calcular-facturacion.ts — el semáforo se calcula
 * siempre en el backend, el frontend solo lo pinta (ver frontend/prompt.md). */
export interface EstadoFacturacion {
  proximaFacturacion: string;
  diasParaFacturacion: number;
  color: "VERDE" | "AMARILLO" | "ROJO";
  enMora: boolean;
  diasEnMora: number;
  puedeOcultar: boolean;
}

export const FACTURACION_COLOR_CLASSES: Record<EstadoFacturacion["color"], string> = {
  VERDE: "bg-emerald-100 text-emerald-700",
  AMARILLO: "bg-amber-100 text-amber-700",
  ROJO: "bg-destructive/10 text-destructive",
};

export interface LimitesIglesia {
  usuarios: { actuales: number; maximo: number };
  departamentosFinancieros: { actuales: number; maximo: number };
}
