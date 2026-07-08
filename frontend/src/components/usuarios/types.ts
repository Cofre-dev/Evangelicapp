export type RolEquipo = "TESORERO" | "SECRETARIA";

export interface UsuarioEquipo {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  rol: RolEquipo;
  activo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}
