export type TipoEvento = "CULTO" | "REUNION" | "LIMPIEZA" | "OTRO";
export type EstadoConfirmacionPredicador = "PENDIENTE" | "CONFIRMADO" | "RECHAZADO";

export interface Predicador {
  id: string;
  nombre: string | null;
  email: string;
  estado: EstadoConfirmacionPredicador;
  respondidoAt: string | null;
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoEvento;
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string | null;
  colorEtiqueta: string | null;
  predicadores: Predicador[];
}

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  CULTO: "Culto",
  REUNION: "Reunión",
  LIMPIEZA: "Limpieza",
  OTRO: "Otro",
};

export const TIPO_EVENTO_CHIP_CLASS: Record<TipoEvento, string> = {
  CULTO: "bg-sky-100 text-sky-700 border-sky-200",
  REUNION: "bg-violet-100 text-violet-700 border-violet-200",
  LIMPIEZA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  OTRO: "bg-slate-100 text-slate-700 border-slate-200",
};

export const ESTADO_PREDICADOR_LABEL: Record<EstadoConfirmacionPredicador, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  RECHAZADO: "Rechazado",
};

export const ESTADO_PREDICADOR_CLASS: Record<EstadoConfirmacionPredicador, string> = {
  PENDIENTE: "bg-muted text-muted-foreground",
  CONFIRMADO: "bg-emerald-100 text-emerald-700",
  RECHAZADO: "bg-red-100 text-red-700",
};
