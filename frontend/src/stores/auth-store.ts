import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Rol = "SUPER_ADMIN" | "PASTOR" | "TESORERO" | "SECRETARIA" | "MIEMBRO";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  rol: Rol;
  iglesiaId: string | null;
  iglesia: { nombre: string; logoUrl: string | null } | null;
  mustChangePassword: boolean;
  onboardingCompletado: boolean;
}

interface AuthState {
  usuario: SessionUser | null;
  /** Zustand persist rehidrata desde localStorage de forma asíncrona — sin esto,
   * una página protegida redirigiría a /login por una fracción de segundo aunque
   * sí haya sesión guardada. */
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setSession: (usuario: SessionUser) => void;
  updateUsuario: (patch: Partial<SessionUser>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSession: (usuario) => set({ usuario }),
      updateUsuario: (patch) =>
        set((state) => (state.usuario ? { usuario: { ...state.usuario, ...patch } } : state)),
      clearSession: () => set({ usuario: null }),
    }),
    {
      name: "evangelicapp-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
