"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { puedeEscribirRed, tieneAccesoRed } from "@/components/red/permisos";
import { RedNav } from "@/components/red/red-nav";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import { useRedStore } from "@/stores/red-store";

/**
 * Shell de la sección Red de iglesias (todos los planes, MANAGER y USUARIO):
 * guard de sesión/rol + subnavegación + carga del contexto compartido
 * (`useRedStore`). Cada página hija igual llama a `useRequireAuth` por su
 * cuenta para leer `usuario`, como el resto de la app.
 */
export default function RedLayout({ children }: { children: React.ReactNode }) {
  const { usuario, ready } = useRequireAuth();
  const cargarPerfil = useRedStore((s) => s.cargarPerfil);
  const cargarLimites = useRedStore((s) => s.cargarLimites);
  const cargarAlianzas = useRedStore((s) => s.cargarAlianzas);
  const reset = useRedStore((s) => s.reset);

  const usuarioId = usuario?.id;
  const acceso = tieneAccesoRed(usuario);
  const escribe = puedeEscribirRed(usuario);

  useEffect(() => {
    if (!usuarioId || !acceso) return;
    void cargarPerfil();
    void cargarAlianzas();
    if (escribe) void cargarLimites();
    return () => reset();
  }, [usuarioId, acceso, escribe, cargarPerfil, cargarAlianzas, cargarLimites, reset]);

  // Una solicitud/aceptación de alianza llega como notificación: refresca el
  // badge de "Alianzas" sin esperar a que el usuario recargue.
  useRealtimeEvent("notificacion:nueva", ({ tipo }) => {
    if (tipo === "ALIANZA_SOLICITADA" || tipo === "ALIANZA_ACEPTADA") void cargarAlianzas();
  });

  if (!ready || !usuario) return null;

  if (!acceso) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para ver esta página.</p>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="h-full bg-background px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <RedNav />
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
