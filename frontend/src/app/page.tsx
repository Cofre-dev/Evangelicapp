"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";

import { useRequireAuth } from "@/hooks/use-require-auth";
import { API_URL } from "@/lib/api";

export default function Home() {
  const { usuario, ready } = useRequireAuth();

  if (!ready || !usuario) {
    return null;
  }

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {usuario.iglesia && (
          <div className="mb-6 flex flex-col items-center gap-2 border-b border-border pb-6">
            {usuario.iglesia.logoUrl ? (
              <Image
                src={`${API_URL}${usuario.iglesia.logoUrl}`}
                alt={`Logo de ${usuario.iglesia.nombre}`}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
                <Building2 className="h-6 w-6" />
              </div>
            )}
            <p className="text-sm font-medium text-foreground">{usuario.iglesia.nombre}</p>
          </div>
        )}

        <h1 className="text-xl font-semibold text-foreground">Hola, {usuario.nombre}</h1>
        <p className="mt-1 text-sm text-muted-foreground">@{usuario.username}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{usuario.rol}</p>
      </div>
    </main>
  );
}
