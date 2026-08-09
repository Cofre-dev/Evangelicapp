export interface MiIglesia {
  id: string;
  nombre: string;
  comuna: string;
  region: string;
  direccion: string | null;
  logoUrl: string | null;
  estado: "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
  visitantesPromedio: number | null;
  createdAt: string;
  updatedAt: string;
}

export type PlanIglesia = "BASICO" | "MEDIO" | "PRO";
export type ColorFacturacion = "VERDE" | "AMARILLO" | "ROJO";

export const PLAN_LABEL: Record<PlanIglesia, string> = {
  BASICO: "Básico",
  MEDIO: "Medio",
  PRO: "Pro",
};

/** Correo del equipo comercial para solicitudes de upgrade (ver frontend/prompt.md). */
export const CONTACTO_VENTAS_EMAIL = "contacto@evangelic.app";

/**
 * Shape de `GET /mi-iglesia/facturacion` (solo MANAGER) — módulo informativo de
 * plan y facturación, sin pasarela de pago todavía (ver frontend/prompt.md).
 */
export interface MiIglesiaFacturacion extends MiIglesia {
  ultimoPagoAt: string | null;
  plan: PlanIglesia;
  facturacion: {
    proximaFacturacion: string;
    /** Negativo cuando ya está vencida. */
    diasParaFacturacion: number;
    color: ColorFacturacion;
    enMora: boolean;
    diasEnMora: number;
  };
  limites: {
    usuarios: { actuales: number; maximo: number };
    /** `maximo: 0` en Básico/Medio significa "sin acceso a subdepartamentos", no un tope bajo. */
    departamentosFinancieros: { actuales: number; maximo: number };
  };
}
