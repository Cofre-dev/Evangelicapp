"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { create } from "zustand";

import { cn } from "@/lib/utils";

// Toast mínimo propio (el repo no tenía librería de toasts): un store global
// de Zustand + <Toaster/> montado una vez en el layout raíz. Se usa con
// `toast("texto")` o `toast.error("texto")` desde cualquier componente cliente.
type ToastTipo = "exito" | "error";

interface ToastItem {
  id: number;
  mensaje: string;
  tipo: ToastTipo;
}

interface ToastState {
  toasts: ToastItem[];
  agregar: (mensaje: string, tipo: ToastTipo) => void;
  quitar: (id: number) => void;
}

const DURACION_MS = 5000;
let siguienteId = 1;

const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  agregar: (mensaje, tipo) => {
    const id = siguienteId++;
    set((state) => ({ toasts: [...state.toasts, { id, mensaje, tipo }] }));
    setTimeout(() => get().quitar(id), DURACION_MS);
  },
  quitar: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(mensaje: string) {
  useToastStore.getState().agregar(mensaje, "exito");
}

toast.error = (mensaje: string) => {
  useToastStore.getState().agregar(mensaje, "error");
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const quitar = useToastStore((state) => state.quitar);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tipo === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg",
            t.tipo === "error" ? "border-destructive/40 text-destructive" : "border-border text-foreground",
          )}
        >
          {t.tipo === "error" ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <p className="flex-1">{t.mensaje}</p>
          <button
            type="button"
            onClick={() => quitar(t.id)}
            aria-label="Cerrar aviso"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
