/** `GRATUITO` (Red de iglesias + plan de autoservicio, ver FEATURES.md
 * 2026-11-26): solo da acceso a la Red de iglesias; el resto de la plataforma
 * es de pago. Una iglesia de pago con 3 días de mora también baja a GRATUITO
 * (`planPrevioMora` guarda el plan que recupera al pagar). */
export type PlanIglesia = "GRATUITO" | "BASICO" | "MEDIO" | "PRO";

/** Planes de pago, en orden de menor a mayor. */
export const PLANES_PAGO = ["BASICO", "MEDIO", "PRO"] as const;
export type PlanPago = (typeof PLANES_PAGO)[number];

export const PLANES_TODOS: PlanIglesia[] = ["GRATUITO", ...PLANES_PAGO];

export const esPlanGratuito = (plan?: PlanIglesia | null) => plan === "GRATUITO";

/** Mismo correo que ya usan facturación, cuenta suspendida y los topes de plan. */
export const CONTACTO_EMAIL = "contacto@evangelicapp.cl";

export const PLAN_LABEL: Record<PlanIglesia, string> = {
  GRATUITO: "Gratuito",
  BASICO: "Básico",
  MEDIO: "Medio",
  PRO: "Pro",
};

export const PLAN_LIMITES: Record<PlanIglesia, { usuarios: number; departamentos: number }> = {
  GRATUITO: { usuarios: 1, departamentos: 0 },
  BASICO: { usuarios: 3, departamentos: 0 },
  MEDIO: { usuarios: 8, departamentos: 0 },
  PRO: { usuarios: 15, departamentos: 10 },
};

export function planTieneSubdepartamentos(plan: PlanIglesia): boolean {
  return PLAN_LIMITES[plan].departamentos > 0;
}

export const PLAN_BADGE_CLASSES: Record<PlanIglesia, string> = {
  GRATUITO: "bg-emerald-50 text-emerald-700",
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

/** Mismo semáforo que `FACTURACION_COLOR_CLASSES` pero como color de borde
 * sólido en vez de fondo de badge — para la franja izquierda de cada fila en
 * `/superadmin/iglesias` (hace escaneable la salud de cobro de todo el
 * portafolio de un vistazo, sin depender de leer una badge a mitad de fila). */
export const FACTURACION_BAR_CLASSES: Record<EstadoFacturacion["color"], string> = {
  VERDE: "border-l-emerald-500",
  AMARILLO: "border-l-amber-500",
  ROJO: "border-l-destructive",
};

export interface LimitesIglesia {
  usuarios: { actuales: number; maximo: number };
  departamentosFinancieros: { actuales: number; maximo: number };
  /** Solo en `GET /mi-iglesia/facturacion` (no en el detalle del SuperAdmin). */
  llamadosAbiertos?: { actuales: number; maximo: number };
}

export type OrigenIglesia = "SUPER_ADMIN" | "AUTOSERVICIO";

export interface MiembroEquipo {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "USUARIO";
  activo: boolean;
  createdAt: string;
}

/** Estadísticas de actividad/uso de una iglesia, bloque nuevo de
 * `GET /iglesias/:id` (ver frontend/prompt.md sección 5). Deliberadamente sin
 * nada financiero: el SuperAdmin no ve el detalle financiero/operativo
 * interno de una iglesia (regla de negocio explícita, no un olvido) — el
 * backend nunca manda montos/movimientos acá. No confundir con la
 * "Facturación" que sí sigue viviendo en `IglesiaDetalle.facturacion`: esa es
 * el cobro de la plataforma a la iglesia (nivel Evangelicapp), no el manejo
 * interno de plata de la propia iglesia (nivel `/finanzas`, ese sí vedado). */
export interface EstadisticasIglesia {
  usuariosActivosHoy: number;
  usuariosActivosSemana: number;
  eventos: { total: number; proximos30d: number };
  integrantesTotal: number;
  certificados: {
    total: number;
    porTipo: import("@/components/dashboard/types").CertificadosPorTipo;
    porMes: import("@/components/dashboard/types").PuntoMes[];
  };
  notasPendientes: number;
}

export interface IglesiaDetalle {
  id: string;
  nombre: string;
  comuna: string;
  region: string;
  direccion: string | null;
  logoUrl: string | null;
  estado: "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
  visitantesPromedio: number | null;
  createdAt: string;
  ultimoPagoAt: string | null;
  plan: PlanIglesia;
  /** Plan que recupera al pagar si bajó a GRATUITO por mora; `null` si no. */
  planPrevioMora: PlanIglesia | null;
  origen: OrigenIglesia;
  verificada: boolean;
  verificadaEn: string | null;
  /** `null` en plan GRATUITO: no hay semáforo ni fecha de cobro. */
  facturacion: EstadoFacturacion | null;
  limites: LimitesIglesia;
  // Este endpoint (`/iglesias/:id`, exclusivo de SUPER_ADMIN) no está
  // mencionado explícitamente en el brief de `frontend/prompt.md`. Se deja el
  // nombre del campo (`pastor`) sin tocar por no tener confirmación de que
  // haya cambiado, pero el valor literal de `rol` sí se actualiza a `MANAGER`
  // porque ese es un enum global del backend y "PASTOR" ya no existe en él —
  // dejarlo en "PASTOR" garantizaría un mismatch de tipos contra la respuesta
  // real. Señalado para confirmar con backend en vez de asumido en silencio.
  pastor: (Omit<MiembroEquipo, "rol"> & { rol: "MANAGER" }) | null;
  equipo: MiembroEquipo[];
  estadisticas: EstadisticasIglesia;
}

/** Forma compacta de iglesia usada tanto en `iglesiasRecientes`
 * (`GET /superadmin/dashboard`) como base de `IglesiaListItem`
 * (`GET /iglesias`) — ver frontend/prompt.md secciones 3 y 4. */
export interface IglesiaResumen {
  id: string;
  nombre: string;
  comuna: string;
  region: string;
  logoUrl: string | null;
  estado: "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
  plan: PlanIglesia;
  createdAt: string;
  pastor: { nombre: string; apellido: string; email: string } | null;
}

/** `GET /iglesias` (nuevo, SuperAdmin) — mismo `IglesiaResumen` + el semáforo
 * de facturación por fila (ver frontend/prompt.md sección 4). */
export interface IglesiaListItem extends IglesiaResumen {
  /** `null` en plan GRATUITO. */
  facturacion: EstadoFacturacion | null;
  planPrevioMora: PlanIglesia | null;
  origen: OrigenIglesia;
  verificada: boolean;
}

/** "Gratuito (mora: Básico)" si bajó por mora, si no el label del plan. */
export function planLabelConMora(plan: PlanIglesia, planPrevioMora: PlanIglesia | null | undefined): string {
  return plan === "GRATUITO" && planPrevioMora ? `Gratuito (mora: ${PLAN_LABEL[planPrevioMora]})` : PLAN_LABEL[plan];
}

/** `GET /iglesias/:id/historial-pagos` (SuperAdmin) — más reciente primero; el
 * último elemento del array es siempre la fecha de adquisición del plan (ver
 * frontend/prompt.md). Sin monto: el modelo de precios todavía no está
 * definido. */
export interface HistorialPagoItem {
  id: string;
  fecha: string;
  createdAt: string;
  registradoPor: { id: string; nombre: string; apellido: string } | null;
}
