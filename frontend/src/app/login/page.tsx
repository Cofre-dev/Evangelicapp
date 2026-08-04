"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Church, Loader2, NotebookPen, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch, setCsrfToken } from "@/lib/api";
import { useAuthStore, type SessionUser } from "@/stores/auth-store";

const loginSchema = z.object({
  username: z.string().min(1, "Ingresa tu usuario"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginResponse {
  usuario: SessionUser;
  requiresPasswordChange: boolean;
  requiresOnboarding: boolean;
  csrfToken: string;
}

const MODULOS = [
  { icon: CalendarDays, label: "Agenda de cultos y actividades" },
  { icon: Wallet, label: "Finanzas claras y ordenadas" },
  { icon: NotebookPen, label: "Tareas y recordatorios del equipo" },
];

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const usuarioActual = useAuthStore((state) => state.usuario);
  const [serverError, setServerError] = useState<string | null>(null);

  // Si ya hay una sesión guardada, /login no debe mostrar el formulario de nuevo.
  useEffect(() => {
    if (hasHydrated && usuarioActual) {
      router.replace("/");
    }
  }, [hasHydrated, usuarioActual, router]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (hasHydrated && usuarioActual) {
    return null;
  }

  async function onSubmit(values: LoginValues) {
    setServerError(null);

    try {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setCsrfToken(response.csrfToken);
      setSession(response.usuario);
      router.push("/");
    } catch (error) {
      if (error instanceof ApiError && (error.body as { code?: string } | null)?.code === "IGLESIA_SUSPENDIDA") {
        const dias = (error.body as { diasEnMora?: number }).diasEnMora ?? 0;
        router.push(`/cuenta-suspendida?dias=${dias}`);
        return;
      }
      setServerError(error instanceof ApiError ? error.message : "No se pudo iniciar sesión");
    }
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Panel de marca: en mobile es una franja superior, en desktop ocupa la mitad de la pantalla. */}
      <div className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-[linear-gradient(160deg,hsl(199_70%_52%),hsl(203_66%_38%)_55%,hsl(212_58%_22%))] px-8 py-10 sm:px-12 sm:py-12 lg:min-h-screen lg:w-1/2 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(0_0%_100%/0.16),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[hsl(199_84%_70%/0.35)] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[hsl(210_60%_30%/0.5)] blur-3xl"
        />

        <div className="relative flex items-center gap-3 lg:mt-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm">
            <Church className="h-6 w-6 text-white" />
          </div>
          <p className="font-display text-2xl italic text-white sm:text-3xl">Evangelicapp</p>
        </div>

        <div className="relative mt-8 hidden max-w-sm lg:block">
          <p className="font-display text-3xl italic leading-snug text-white xl:text-4xl">
            Un lugar propio para cada iglesia, cada pastor, cada comunidad.
          </p>
        </div>

        <div className="relative mt-8 flex flex-col gap-3 lg:mt-auto">
          {MODULOS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm text-white/90">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div className="flex flex-1 items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-semibold text-foreground">Bienvenido de nuevo</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ingresa con las credenciales de tu iglesia</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input autoComplete="username" placeholder="jperez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Contraseña</FormLabel>
                      <Link href="/recuperar-password" className="text-xs text-muted-foreground hover:text-primary">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar sesión"}
              </Button>
            </form>
          </Form>

          <p className="mt-8 text-center text-xs text-muted-foreground lg:text-left">
            ¿No tienes una cuenta? Pídele acceso al pastor o administrador de tu iglesia.
          </p>
        </div>
      </div>
    </main>
  );
}
