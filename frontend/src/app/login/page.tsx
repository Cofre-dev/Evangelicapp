"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch, setCsrfToken } from "@/lib/api";
import { useAuthStore, type SessionUser } from "@/stores/auth-store";
import logoMark from "@/img/photo/logo-mark.png";

const loginSchema = z.object({
  email: z.string().min(1, "Ingresa tu correo electrónico").email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginResponse {
  usuario: SessionUser;
  requiresPasswordChange: boolean;
  requiresOnboarding: boolean;
  csrfToken: string;
}

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
    defaultValues: { email: "", password: "" },
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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="relative w-full max-w-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-40 w-40 -translate-x-1/2 -translate-y-6 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="flex flex-col items-center text-center">
          <Image src={logoMark} alt="" priority className="h-16 w-16" />
          <p className="mt-4 font-display text-2xl italic text-primary">Evangelicapp</p>
          <h1 className="mt-6 text-lg font-medium text-foreground">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa con las credenciales de tu iglesia</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="pastor@demo.cl" {...field} />
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
                  <FormLabel>Contraseña</FormLabel>
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          ¿No tienes una cuenta? Pídele acceso al pastor o administrador de tu iglesia.
        </p>
      </div>
    </main>
  );
}
