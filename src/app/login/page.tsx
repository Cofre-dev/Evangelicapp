"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";
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

      setSession(response.usuario);
      router.push("/");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "No se pudo iniciar sesión");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(160deg,hsl(var(--primary)/0.14),hsl(var(--accent)/0.5)_60%,hsl(var(--background)))] p-4">
      <Card className="w-full max-w-sm border-border/80 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-3xl italic text-primary">Evangelicapp</CardTitle>
          <CardDescription>Ingresa con las credenciales de tu iglesia</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
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
        </CardContent>
      </Card>
    </main>
  );
}
