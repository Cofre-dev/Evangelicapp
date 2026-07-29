export type RolEquipo = "TESORERO" | "SECRETARIA";

export interface UsuarioEquipo {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  fotoUrl: string | null;
  rol: RolEquipo;
  activo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

/** Roles que pueden aparecer en el directorio de equipo (`GET /usuarios/equipo`) —
 * a diferencia de `RolEquipo`, incluye PASTOR (el directorio sí lo lista) y
 * MIEMBRO (aunque hoy no sea un caso real, el enum crudo del backend lo contempla). */
export type RolEquipoDirectorio = "PASTOR" | "TESORERO" | "SECRETARIA" | "MIEMBRO";

export const ROL_EQUIPO_DIRECTORIO_LABEL: Record<RolEquipoDirectorio, string> = {
  PASTOR: "Pastor",
  TESORERO: "Tesorero",
  SECRETARIA: "Secretaria",
  MIEMBRO: "Miembro",
};

/** Tarjeta de presentación del directorio — solo lo necesario para mostrarla
 * (foto + nombre + rol), sin datos de contacto ni de gestión. */
export interface UsuarioEquipoDirectorio {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
  rol: RolEquipoDirectorio;
}
