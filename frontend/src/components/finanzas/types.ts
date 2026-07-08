export type TipoMovimiento = "INGRESO" | "EGRESO";
export type MedioPago = "EFECTIVO" | "TRANSFERENCIA";
export type AccionAuditoria = "CREACION" | "EDICION" | "ELIMINACION";

export const MEDIO_PAGO_LABEL: Record<MedioPago, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export const ACCION_AUDITORIA_LABEL: Record<AccionAuditoria, string> = {
  CREACION: "Creó",
  EDICION: "Editó",
  ELIMINACION: "Eliminó",
};

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
  descripcion: string;
  medioPago: MedioPago;
  categoria: Categoria;
  createdAt: string;
  updatedAt: string;
  creadoPor: { nombre: string; apellido: string } | null;
}

export interface MovimientoAuditLog {
  id: string;
  accion: AccionAuditoria;
  createdAt: string;
  movimientoId: string;
  usuario: { nombre: string; apellido: string } | null;
  snapshot: {
    tipo: TipoMovimiento;
    monto: number;
    descripcion: string;
    medioPago: MedioPago;
    fecha: string;
    categoria: string;
  };
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
