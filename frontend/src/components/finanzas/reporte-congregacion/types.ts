import type { TipoMovimiento } from "../types";

export type OrigenEnvioReporte = "AUTOMATICO" | "MANUAL";

export interface TotalPorCategoria {
  categoria: string;
  total: number;
}

export interface ReporteFinancieroData {
  /** "YYYY-MM" */
  periodo: string;
  totales: { ingresos: number; egresos: number; balance: number };
  /** Ordenadas de mayor a menor; "Otros ingresos" va al final si existe. */
  ingresosPorCategoria: TotalPorCategoria[];
  egresosPorCategoria: TotalPorCategoria[];
}

export interface EnvioReporte {
  id: string;
  periodo: string;
  origen: OrigenEnvioReporte;
  /** Integrantes con consentimiento al momento del envío. */
  destinatarios: number;
  /** null mientras el envío sigue en curso. */
  enviados: number | null;
  /** null mientras el envío sigue en curso. */
  fallidos: number | null;
  /** null = todavía enviando. */
  completadoEn: string | null;
  createdAt: string;
  /** null en los automáticos. */
  enviadoPor: { nombre: string; apellido: string } | null;
}

export interface EnvioReporteConSnapshot extends EnvioReporte {
  /** Los números tal como salieron en el correo. */
  snapshot: ReporteFinancieroData;
}

export interface CategoriaReporte {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  ocultaEnReporte: boolean;
  /** null = finanzas general. */
  departamento: { id: string; nombre: string } | null;
}

export interface ConfiguracionReporte {
  activo: boolean;
  activadoEn: string | null;
  activadoPor: { nombre: string; apellido: string } | null;
  destinatarios: { aceptan: number; totalIntegrantes: number };
  /** null si está apagado. */
  proximoEnvioAutomatico: string | null;
  /** Último mes cerrado, ej. "2026-10". */
  periodoSugerido: string;
  mesesAtrasPermitidos: number;
  categorias: CategoriaReporte[];
  ultimoEnvio: EnvioReporte | null;
}

export interface VistaPreviaReporte {
  periodo: string;
  reporte: ReporteFinancieroData;
  destinatarios: number;
  /** Si ese mes ya se envió. */
  envioExistente: EnvioReporte | null;
  asunto: string;
  /** HTML exacto del correo (con saludo de ejemplo). Renderizar SOLO en <iframe sandbox="">. */
  html: string;
}

export interface SuscripcionReporte {
  nombreIglesia: string;
  logoUrl: string | null;
  suscrito: boolean;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "2026-10" → "Octubre 2026" */
export function labelPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return `${MESES[mes - 1] ?? periodo} ${anio}`;
}

/** Últimos `cantidad` meses cerrados ("YYYY-MM"), del más reciente al más antiguo (excluye el mes en curso). */
export function periodosCerrados(cantidad: number, hoy = new Date()): string[] {
  const periodos: string[] = [];
  for (let i = 1; i <= cantidad; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    periodos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periodos;
}

export function formatearFechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" });
}

export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" });
}
