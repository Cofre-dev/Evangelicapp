"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Church, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";

// Mismas reglas que el backend (ResetPasswordDto — ver auth/dto/reset-password.dto.ts).
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Debe tener al menos 8 caracteres")
      .regex(/(?=.*[a-zA-Z])(?=.*[0-9])/, "Debe incluir al menos una letra y un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function CargandoCard() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      Validando link...
    </div>
  );
}

export default function RecuperarPasswordTokenPage() {
  const params = useParams<{ token: string }>();

  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [completado, setCompletado] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!params.token) return;

    apiFetch<{ valid: true }>(`/auth/reset-password/${params.token}`)
      .then(() => setTokenValido(true))
      .catch(() => setTokenValido(false));
  }, [params.token]);

  async function onSubmit(values: ResetPasswordValues) {
    if (!params.token) return;
    setServerError(null);

    try {
      await apiFetch<void>(`/auth/reset-password/${params.token}`, {
        method: "POST",
        body: JSON.stringify({ password: values.newPassword }),
      });
      setCompletado(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // El link pudo vencer o ya haberse usado entre que se validó y este submit.
        setTokenValido(false);
        return;
      }
      setServerError(error instanceof ApiError ? error.message : "No se pudo actualizar la contraseña");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
            <Church className="h-6 w-6" />
          </div>
          <h1 className="mt-1 text-lg font-semibold text-foreground">Definir nueva contraseña</h1>
        </div>

        {tokenValido === null ? (
          <CargandoCard />
        ) : tokenValido === false ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <Alert variant="destructive">
              <AlertDescription>Este link no es válido o ya expiró.</AlertDescription>
            </Alert>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/recuperar-password">Pedir un link nuevo</Link>
            </Button>
          </div>
        ) : completado ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-sm text-muted-foreground">
              Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con ella.
            </p>
            <Button asChild className="mt-2 w-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirma la nueva contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
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
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar contraseña"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </main>
  );
}
