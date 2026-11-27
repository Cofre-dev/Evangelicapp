import type { PlanIglesia } from "@/components/iglesias/types";

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
  plan: PlanIglesia;
  verificada: boolean;
}
