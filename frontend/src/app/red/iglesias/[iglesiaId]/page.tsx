"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Globe, Loader2, Mail, Phone } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import { AlianzaAccion } from "@/components/red/alianza-accion";
import { LlamadoCard } from "@/components/red/llamado-card";
import { puedeEscribirRed } from "@/components/red/permisos";
import type { PerfilIglesiaRed } from "@/components/red/types";
import { VerificadaBadge } from "@/components/red/verificada-badge";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";

/** Solo se linkea a URLs http(s): el backend ya exige `https://`, esto es
 * una segunda barrera contra un `javascript:` en el href. */
function urlSegura(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export default function PerfilIglesiaRedPage() {
  const params = useParams<{ iglesiaId: string }>();
  const { usuario } = useRequireAuth();

  const [perfil, setPerfil] = useState<PerfilIglesiaRed | null>(null);
  const [loading, setLoading] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario || !params.iglesiaId) return;
    setLoading(true);
    apiFetch<PerfilIglesiaRed>(`/red/iglesias/${params.iglesiaId}`)
      .then((p) => {
        setPerfil(p);
        setNoEncontrada(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNoEncontrada(true);
        else setError(err instanceof ApiError ? err.message : "No se pudo cargar la iglesia");
      })
      .finally(() => setLoading(false));
  }, [usuario, params.iglesiaId]);

  if (!usuario) return null;

  const volver = (
    <Link
      href="/red/iglesias"
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver al directorio
    </Link>
  );

  if (loading) {
    return (
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando…
      </div>
    );
  }

  if (noEncontrada) {
    return (
      <div>
        {volver}
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Esta iglesia no está en el directorio.</p>
        </div>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div>
        {volver}
        <Alert variant="destructive">
          <AlertDescription>{error ?? "No se pudo cargar la iglesia"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const sitio = perfil.sitioWeb ? urlSegura(perfil.sitioWeb) : null;
  const tieneContacto = Boolean(perfil.emailContacto || perfil.telefonoContacto || sitio);

  return (
    <div>
      {volver}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <IglesiaLogo logoUrl={perfil.logoUrl} nombre={perfil.nombre} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{perfil.nombre}</h1>
              <VerificadaBadge verificada={perfil.verificada} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {perfil.comuna}, {perfil.region}
            </p>
            <div className="mt-3">
              <AlianzaAccion
                iglesiaId={perfil.iglesiaId}
                nombre={perfil.nombre}
                alianza={perfil.alianza}
                puedeEscribir={puedeEscribirRed(usuario)}
                onCambio={(alianza) => setPerfil((p) => (p ? { ...p, alianza } : p))}
              />
            </div>
          </div>
        </div>

        {perfil.descripcion && (
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-foreground">{perfil.descripcion}</p>
        )}

        {tieneContacto && (
          <ul className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
            {perfil.emailContacto && (
              <li>
                <a
                  href={`mailto:${perfil.emailContacto}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" aria-hidden />
                  {perfil.emailContacto}
                </a>
              </li>
            )}
            {perfil.telefonoContacto && (
              <li>
                <a
                  href={`tel:${perfil.telefonoContacto.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  {perfil.telefonoContacto}
                </a>
              </li>
            )}
            {sitio && (
              <li>
                <a
                  href={sitio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" aria-hidden />
                  {perfil.sitioWeb}
                </a>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-foreground">Llamados activos</h2>
        {perfil.llamados.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Esta iglesia no tiene llamados activos visibles para ti.</p>
        ) : (
          <div className="mt-3 grid gap-4">
            {perfil.llamados.map((l) => (
              <LlamadoCard key={l.id} llamado={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
