"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Church, Loader2, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Ingresa tu correo").email("Ingresa un correo válido"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Página pública. La respuesta del backend (POST /auth/forgot-password) es siempre
 * genérica exista o no la cuenta (ver AuthService#forgotPassword) — acá se refleja
 * eso mostrando el mismo mensaje de confirmación sin importar el resultado real.
 */
export default function RecuperarPasswordPage() {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const [enviado, setEnviado] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);

    try {
      await apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setEnviado(true);
    } catch (error) {
      // El backend nunca responde 4xx por "correo no encontrado" (ver AuthService#forgotPassword)
      // — un error acá es de verdad (ej. 429 por demasiados intentos), sí vale la pena mostrarlo.
      setServerError(error instanceof ApiError ? error.message : "No se pudo enviar la solicitud");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
            <Church className="h-6 w-6" />
          </div>
          <h1 className="mt-1 text-lg font-semibold text-foreground">Recuperar contraseña</h1>
        </div>

        {enviado ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <MailCheck className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              Si el correo está registrado, te llegará un link para recuperar tu contraseña en unos minutos.
            </p>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/login">Volver a iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Ingresa el correo con el que te registraste y te enviaremos un link para definir una contraseña nueva.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="tucorreo@iglesia.cl" {...field} />
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
                  {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link href="/login" className="hover:text-primary">
                Volver a iniciar sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
