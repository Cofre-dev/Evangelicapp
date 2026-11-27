/**
 * Contratos de la Red de iglesias (ver FEATURES.md 2026-11-26 y el brief del
 * backend). El progreso de las necesidades y el estado CUBIERTO los calcula
 * SIEMPRE el backend: el frontend solo pinta `comprometido`, `cubierta` y
 * `estado`.
 */
import type { PlanIglesia } from "@/components/iglesias/types";

export type { PlanIglesia };

export type TipoLlamado = "OPERATIVO_SOCIAL" | "VOLUNTARIADO" | "RECOLECCION" | "EVENTO_CONJUNTO" | "OTRO";
export type VisibilidadLlamado = "COMUNA" | "REGION" | "NACIONAL" | "ALIADAS";
export type EstadoLlamado = "ABIERTO" | "CUBIERTO" | "CERRADO";
export type TipoNecesidad = "VOLUNTARIOS" | "INSUMOS" | "SERVICIO" | "OTRO";
export type EstadoAlianzaVista = "ACEPTADA" | "PENDIENTE_ENVIADA" | "PENDIENTE_RECIBIDA" | "RECHAZADA" | null;
export type TipoNotificacion =
  | "LLAMADO_NUEVO"
  | "COMPROMISO_NUEVO"
  | "COMPROMISO_CANCELADO"
  | "LLAMADO_CUBIERTO"
  | "ALIANZA_SOLICITADA"
  | "ALIANZA_ACEPTADA"
  | "IGLESIA_VERIFICADA"
  | "PLAN_DEGRADADO";

export type AlcanceFeed = "TODO" | "COMUNA" | "REGION" | "NACIONAL" | "ALIADAS";

/** `porPagina` = 20 en todos los listados paginados de la red. */
export interface Paginado<T> {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Cara pública de una iglesia en la red. */
export interface PerfilPublico {
  iglesiaId: string;
  nombre: string;
  comuna: string;
  region: string;
  logoUrl: string | null;
  verificada: boolean;
}

/** GET/PATCH /red/perfil (el propio). */
export interface MiPerfilRed extends PerfilPublico {
  id: string;
  descripcion: string | null;
  emailContacto: string | null;
  telefonoContacto: string | null;
  sitioWeb: string | null;
  /** Aparecer o no en el listado del directorio. */
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemDirectorio extends PerfilPublico {
  descripcion: string | null;
  /** Relación con MI iglesia. */
  alianza: EstadoAlianzaVista;
}

export interface PerfilIglesiaRed extends PerfilPublico {
  descripcion: string | null;
  emailContacto: string | null;
  telefonoContacto: string | null;
  sitioWeb: string | null;
  alianza: EstadoAlianzaVista;
  /** Sus llamados activos que yo puedo ver. */
  llamados: LlamadoResumen[];
}

export interface ProgresoNecesidad {
  id: string;
  descripcion: string;
  tipo: TipoNecesidad;
  /** `null` = sin meta numérica ("lo que puedan"). */
  cantidadMeta: number | null;
  /** "personas", "kg", "cajas"... */
  unidad: string | null;
  orden: number;
  /** Suma de cantidades comprometidas. */
  comprometido: number;
  /** Iglesias distintas que apoyan esta necesidad. */
  iglesias: number;
  /** Solo puede ser true si hay meta. */
  cubierta: boolean;
}

export interface LlamadoResumen {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoLlamado;
  visibilidad: VisibilidadLlamado;
  estado: EstadoLlamado;
  comuna: string;
  region: string;
  direccion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  /** Solo puede ser true en MIS llamados (oculto por el SuperAdmin). */
  ocultoModeracion: boolean;
  cerradoEn: string | null;
  createdAt: string;
  updatedAt: string;
  esPropio: boolean;
  /** La autora. */
  iglesia: PerfilPublico | null;
  necesidades: ProgresoNecesidad[];
  iglesiasApoyando: number;
  /** Mi iglesia ya se comprometió con algo de este llamado. */
  yoApoyo: boolean;
}

export interface CompromisoEnLlamado {
  id: string;
  iglesiaId: string;
  /** `null` = apoyo general al llamado. */
  necesidadId: string | null;
  cantidad: number | null;
  mensaje: string | null;
  createdAt: string;
  esPropio: boolean;
  iglesia: PerfilPublico | null;
}

export interface LlamadoDetalle extends LlamadoResumen {
  /** Solo los ACTIVOS. */
  compromisos: CompromisoEnLlamado[];
}

export interface MiCompromiso {
  id: string;
  cantidad: number | null;
  mensaje: string | null;
  createdAt: string;
  necesidad: { id: string; descripcion: string; unidad: string | null } | null;
  llamado: {
    id: string;
    titulo: string;
    estado: EstadoLlamado;
    comuna: string;
    region: string;
    fechaInicio: string | null;
    iglesia: PerfilPublico | null;
  };
}

export interface AlianzaItem {
  id: string;
  estado: "PENDIENTE" | "ACEPTADA" | "RECHAZADA";
  mensaje: string | null;
  respondidaEn: string | null;
  createdAt: string;
  direccion: "ENVIADA" | "RECIBIDA";
  /** La otra iglesia. */
  iglesia: PerfilPublico | null;
}

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  /** Ruta del frontend a la que lleva el clic. */
  url: string | null;
  leidaEn: string | null;
  createdAt: string;
}

export interface CreateLlamadoBody {
  titulo: string;
  descripcion: string;
  tipo: TipoLlamado;
  visibilidad: VisibilidadLlamado;
  region?: string;
  comuna?: string;
  direccion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  necesidades?: Array<{
    descripcion: string;
    tipo: TipoNecesidad;
    cantidadMeta?: number;
    unidad?: string;
  }>;
}

/** Item de `GET /red/moderacion/reportes` (solo SUPER_ADMIN). */
export interface ReporteModeracion {
  id: string;
  motivo: string;
  createdAt: string;
  revisadoEn: string | null;
  /** Quien reporta. */
  iglesia: { id: string; nombre: string };
  llamado: {
    id: string;
    titulo: string;
    descripcion: string;
    estado: EstadoLlamado;
    ocultoModeracion: boolean;
    createdAt: string;
    iglesia: { id: string; nombre: string; comuna: string; region: string };
  };
}

// --- Labels en español -------------------------------------------------------

export const TIPO_LLAMADO_LABEL: Record<TipoLlamado, string> = {
  OPERATIVO_SOCIAL: "Operativo social",
  VOLUNTARIADO: "Voluntariado",
  RECOLECCION: "Recolección",
  EVENTO_CONJUNTO: "Evento conjunto",
  OTRO: "Otro",
};

export const TIPO_NECESIDAD_LABEL: Record<TipoNecesidad, string> = {
  VOLUNTARIOS: "Voluntarios",
  INSUMOS: "Insumos",
  SERVICIO: "Servicio",
  OTRO: "Otro",
};

export const ESTADO_LLAMADO_LABEL: Record<EstadoLlamado, string> = {
  ABIERTO: "Abierto",
  CUBIERTO: "Cubierto",
  CERRADO: "Cerrado",
};

export const ESTADO_LLAMADO_CLASSES: Record<EstadoLlamado, string> = {
  ABIERTO: "bg-emerald-100 text-emerald-700",
  CUBIERTO: "bg-sky-100 text-sky-700",
  CERRADO: "bg-muted text-muted-foreground",
};

export const VISIBILIDAD_LABEL: Record<VisibilidadLlamado, string> = {
  COMUNA: "Mi comuna",
  REGION: "Mi región",
  NACIONAL: "Todo el país",
  ALIADAS: "Solo aliadas",
};

export const ALCANCE_LABEL: Record<AlcanceFeed, string> = {
  TODO: "Todo",
  COMUNA: "Mi comuna",
  REGION: "Mi región",
  NACIONAL: "Nacional",
  ALIADAS: "Aliadas",
};

export const UNIDADES_SUGERIDAS = ["personas", "kg", "cajas", "litros"];
