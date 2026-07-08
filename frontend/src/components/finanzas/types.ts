export type TipoMovimiento = "INGRESO" | "EGRESO";

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
}

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  /** Prisma.Decimal viaja como string por JSON — convertir con Number() al usar. */
  monto: string;
  fecha: string;
  descripcion: string | null;
  categoria: Categoria;
}

export interface FinanzasDashboard {
  totales: { ingresos: number; egresos: number; balance: number };
  porCategoriaIngreso: { categoria: string; total: number }[];
  porCategoriaEgreso: { categoria: string; total: number }[];
}

export const formatoCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
