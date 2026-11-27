import { esPlanGratuito } from "@/components/iglesias/types";
import type { SessionUser } from "@/stores/auth-store";

/** Leer la red (feed, directorio, llamados, alianzas, notificaciones):
 * `MANAGER` y `USUARIO`, en todos los planes. */
export function tieneAccesoRed(usuario: SessionUser | null): boolean {
  return usuario?.rol === "MANAGER" || usuario?.rol === "USUARIO";
}

/** Escribir en la red (perfil, publicar/editar/cerrar llamados, "¡Yo te
 * ayudo!", alianzas, reportar): solo `MANAGER` — el backend responde 403 a un
 * USUARIO, así que esas acciones ni se muestran. */
export function puedeEscribirRed(usuario: SessionUser | null): boolean {
  return usuario?.rol === "MANAGER";
}

export function iglesiaEnPlanGratuito(usuario: SessionUser | null): boolean {
  return Boolean(usuario?.iglesia && esPlanGratuito(usuario.iglesia.plan));
}

/**
 * Prefijos de rutas de módulos de pago. Una iglesia GRATUITO que entra por URL
 * a cualquiera de estas ve el upsell en pantalla completa (gate en
 * `app-shell.tsx`) en vez de montar la página: así no se dispara ninguna
 * request que el backend vaya a rechazar con `REQUIERE_PLAN_PAGO`. Las rutas
 * públicas que comparten prefijo (`/agenda/convocatoria/*`,
 * `/agenda/asistencia/*`, `/integrantes/registro/*`) se renderizan sin shell
 * y nunca pasan por el gate.
 */
const PREFIJOS_RUTAS_DE_PAGO = [
  "/agenda",
  "/finanzas",
  "/ceremonias",
  "/integrantes",
  "/notas",
  "/equipo",
  "/accesos",
];

export function esRutaDePago(pathname: string): boolean {
  return PREFIJOS_RUTAS_DE_PAGO.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
