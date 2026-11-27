import { create } from "zustand";

import type { AlianzaItem, MiPerfilRed } from "@/components/red/types";
import type { FacturacionResponse } from "@/components/facturacion/types";
import { apiFetch } from "@/lib/api";

/**
 * Contexto compartido por todas las pantallas de `/red` (sin `persist`):
 * - `perfil`: mi perfil en la red (comuna/región propias para el chip del
 *   feed, la visibilidad de un llamado nuevo y el filtro por defecto del
 *   directorio).
 * - `llamadosAbiertos`: cupo del plan (`GET /mi-iglesia/facturacion`).
 * - `pendientesRecibidas` / `aliadas`: badge de la subnavegación y
 *   habilitación de la visibilidad "Solo aliadas".
 * Lo carga `src/app/red/layout.tsx` al entrar a la sección; las pantallas que
 * cambian alguno de estos datos llaman al `cargar*` correspondiente.
 */
interface RedState {
  perfil: MiPerfilRed | null;
  /** `true` una vez terminado el primer intento de cargar el perfil (haya
   * resultado o no), para que el directorio no espere para siempre. */
  perfilCargado: boolean;
  llamadosAbiertos: { actuales: number; maximo: number } | null;
  pendientesRecibidas: number;
  aliadas: number;
  /** `true` una vez que se intentó cargar alianzas (para no sugerir "busca
   * iglesias" antes de saber si hay aliadas). */
  alianzasCargadas: boolean;
  setPerfil: (perfil: MiPerfilRed) => void;
  cargarPerfil: () => Promise<void>;
  cargarLimites: () => Promise<void>;
  cargarAlianzas: () => Promise<void>;
  reset: () => void;
}

export const useRedStore = create<RedState>((set) => ({
  perfil: null,
  perfilCargado: false,
  llamadosAbiertos: null,
  pendientesRecibidas: 0,
  aliadas: 0,
  alianzasCargadas: false,
  setPerfil: (perfil) => set({ perfil }),
  cargarPerfil: async () => {
    try {
      set({ perfil: await apiFetch<MiPerfilRed>("/red/perfil"), perfilCargado: true });
    } catch {
      // No crítico: las pantallas funcionan sin el chip de comuna.
      set({ perfilCargado: true });
    }
  },
  cargarLimites: async () => {
    try {
      const data = await apiFetch<FacturacionResponse>("/mi-iglesia/facturacion");
      set({ llamadosAbiertos: data.limites.llamadosAbiertos ?? null });
    } catch {
      // Sin dato de cupo: el botón de publicar queda habilitado y el backend
      // responde LIMITE_PLAN si corresponde.
    }
  },
  cargarAlianzas: async () => {
    try {
      const items = await apiFetch<AlianzaItem[]>("/red/alianzas");
      set({
        pendientesRecibidas: items.filter((a) => a.estado === "PENDIENTE" && a.direccion === "RECIBIDA").length,
        aliadas: items.filter((a) => a.estado === "ACEPTADA").length,
        alianzasCargadas: true,
      });
    } catch {
      set({ alianzasCargadas: true });
    }
  },
  reset: () =>
    set({ perfil: null, perfilCargado: false, llamadosAbiertos: null, pendientesRecibidas: 0, aliadas: 0, alianzasCargadas: false }),
}));
