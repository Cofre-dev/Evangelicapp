"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CircleCheck, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import logoMark from "@/img/photo/logo-mark.png";

interface ConfirmacionResponse {
  estado: "CONFIRMADA" | "YA_CONFIRMADA";
  email: string;
  username: string;
}

type Estado =
  | { tipo: "cargando" }
  | { tipo: "ok"; email: string }
  | { tipo: "vencido" }
  | { tipo: "invalido" }
  | { tipo: "error"; mensaje: string };

/** El backend es idempotente (`YA_CONFIRMADA`), así que no importa que React
 * ejecute el efecto dos veces en desarrollo. */
export default function ConfirmarRegistroPage() {
  const params = useParams<{ token: string }>();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  useEffect(() => {
    if (!params.token) return;
    apiFetch<ConfirmacionResponse>(`/red/registro/confirmar/${encodeURIComponent(params.token)}`, { method: "POST" })
      .then((res) => setEstado({ tipo: "ok", email: res.email }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 410) setEstado({ tipo: "vencido" });
        else if (err instanceof ApiError && err.status === 404) setEstado({ tipo: "invalido" });
        else setEstado({ tipo: "error", mensaje: err instanceof ApiError ? err.message : "No se pudo confirmar la cuenta" });
      });
  }, [params.token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div aria-hidden className="h-1.5 bg-[linear-gradient(90deg,hsl(199_70%_52%),hsl(203_66%_42%))]" />
        <div className="p-8 text-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Image src={logoMark} alt="" priority className="h-7 w-7" />
            <p className="font-display text-base italic text-primary">Evangelicapp</p>
          </div>

          {estado.tipo === "cargando" && (
            <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Activando tu cuenta…
            </div>
          )}

          {estado.tipo === "ok" && (
            <div className="flex flex-col items-center gap-3">
              <CircleCheck className="h-12 w-12 text-emerald-600" aria-hidden />
              <h1 className="text-xl font-semibold text-foreground">¡Listo! Tu iglesia ya está en Evangelicapp.</h1>
              <p className="text-sm text-muted-foreground">Inicia sesión con tu correo y la contraseña que elegiste.</p>
              <Button asChild className="mt-2 w-full">
                <Link href={`/login?email=${encodeURIComponent(estado.email)}`}>Iniciar sesión</Link>
              </Button>
            </div>
          )}

          {estado.tipo === "vencido" && (
            <div className="space-y-4">
              <p className="text-sm text-foreground">El enlace venció. Vuelve a registrar tu iglesia.</p>
              <Button asChild className="w-full">
                <Link href="/registro">Registrar mi iglesia</Link>
              </Button>
            </div>
          )}

          {estado.tipo === "invalido" && (
            <Alert variant="destructive">
              <AlertDescription>Este enlace no es válido.</AlertDescription>
            </Alert>
          )}

          {estado.tipo === "error" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{estado.mensaje}</AlertDescription>
              </Alert>
              <Button asChild variant="outline" className="w-full">
                <Link href="/registro">Volver al registro</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
