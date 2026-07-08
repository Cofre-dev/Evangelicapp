"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { API_URL, ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface MiembroEquipo {
  id: string;
  username: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "TESORERO" | "SECRETARIA";
  activo: boolean;
  createdAt: string;
}

interface IglesiaDetalle {
  id: string;
  nombre: string;
  comuna: string;
  region: string;
  direccion: string | null;
  logoUrl: string | null;
  estado: "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
  visitantesPromedio: number | null;
  createdAt: string;
  pastor: (Omit<MiembroEquipo, "rol"> & { rol: "PASTOR" }) | null;
  equipo: MiembroEquipo[];
}

const ROL_LABEL: Record<MiembroEquipo["rol"], string> = {
  TESORERO: "Tesorero",
  SECRETARIA: "Secretaria",
};

const ESTADO_LABEL: Record<IglesiaDetalle["estado"], string> = {
  ACTIVA: "Activa",
  SUSPENDIDA: "Suspendida",
  INACTIVA: "Inactiva",
};

function PersonaRow({ nombre, apellido, cargo, email }: { nombre: string; apellido: string; cargo: string; email: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
      <div>
        <p className="text-base font-semibold text-foreground">
          {nombre} {apellido}
        </p>
        <p className="text-xs text-muted-foreground">{cargo}</p>
      </div>
      <p className="text-sm text-muted-foreground">{email}</p>
    </div>
  );
}

export default function IglesiaDetallePage() {
  const params = useParams<{ id: string }>();
  const { usuario, ready } = useRequireAuth();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [data, setData] = useState<IglesiaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !params.id) return;

    apiFetch<IglesiaDetalle>(`/iglesias/${params.id}`, { token: accessToken })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la iglesia"))
      .finally(() => setLoading(false));
  }, [accessToken, params.id]);

  if (!ready || !usuario) {
    return null;
  }

  if (usuario.rol !== "SUPER_ADMIN") {
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
    <main className="h-full bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/superadmin"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al dashboard
        </Link>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando iglesia...
          </div>
        ) : data ? (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start gap-4">
                {data.logoUrl ? (
                  <Image
                    src={`${API_URL}${data.logoUrl}`}
                    alt={`Logo de ${data.nombre}`}
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-foreground">{data.nombre}</h1>
                    <span
                      className={
                        data.estado === "ACTIVA"
                          ? "rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {ESTADO_LABEL[data.estado]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.comuna}, {data.region}
                  </p>
                  {data.direccion && <p className="text-sm text-muted-foreground">{data.direccion}</p>}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Creada</p>
                  <p className="text-foreground">{new Date(data.createdAt).toLocaleDateString("es-CL")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Visitantes promedio</p>
                  <p className="text-foreground">{data.visitantesPromedio ?? "—"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-medium text-foreground">Pastor a cargo</h2>
              <div className="mt-3">
                {data.pastor ? (
                  <PersonaRow
                    nombre={data.pastor.nombre}
                    apellido={data.pastor.apellido}
                    cargo={`Pastor · @${data.pastor.username}`}
                    email={data.pastor.email}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Sin pastor asignado.</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-medium text-foreground">Equipo</h2>
              <div className="mt-3 space-y-2">
                {data.equipo.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Esta iglesia todavía no tiene equipo agregado.</p>
                ) : (
                  data.equipo.map((miembro) => (
                    <PersonaRow
                      key={miembro.id}
                      nombre={miembro.nombre}
                      apellido={miembro.apellido}
                      cargo={`${ROL_LABEL[miembro.rol]} · @${miembro.username}${miembro.activo ? "" : " · Inactivo"}`}
                      email={miembro.email}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
