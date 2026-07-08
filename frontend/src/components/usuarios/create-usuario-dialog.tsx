"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { UsuarioEquipo } from "./types";

const USERNAME_REGEX = /^[a-z][a-z0-9._]{3,19}$/;

const createUsuarioSchema = z.object({
  username: z
    .string()
    .min(1, "Ingresa un usuario")
    .regex(USERNAME_REGEX, "4-20 caracteres, minúsculas, empieza con letra"),
  email: z.string().min(1, "Ingresa un correo").email("Correo inválido"),
  nombre: z.string().min(1, "Ingresa el nombre"),
  apellido: z.string().min(1, "Ingresa el apellido"),
  telefono: z.string().optional(),
  rol: z.enum(["TESORERO", "SECRETARIA"], { errorMap: () => ({ message: "Selecciona un rol" }) }),
});

type CreateUsuarioValues = z.infer<typeof createUsuarioSchema>;

interface CreateUsuarioResponse {
  usuario: UsuarioEquipo;
  temporaryPassword: string;
}

export function CreateUsuarioDialog({ onCreated }: { onCreated: (usuario: UsuarioEquipo) => void }) {
  const accessToken = useAuthStore((state) => state.accessToken);

  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateUsuarioResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateUsuarioValues>({
    resolver: zodResolver(createUsuarioSchema),
    defaultValues: { username: "", email: "", nombre: "", apellido: "", telefono: "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset();
      setServerError(null);
      setResult(null);
      setCopied(false);
    }
  }

  async function onSubmit(values: CreateUsuarioValues) {
    if (!accessToken) return;
    setServerError(null);

    try {
      const response = await apiFetch<CreateUsuarioResponse>("/usuarios", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          nombre: values.nombre,
          apellido: values.apellido,
          telefono: values.telefono || undefined,
          rol: values.rol,
        }),
      });

      setResult(response);
      onCreated(response.usuario);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "No se pudo crear el usuario");
    }
  }

  async function copyPassword() {
    if (!result) return;
    await navigator.clipboard.writeText(result.temporaryPassword);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Usuario creado</DialogTitle>
              <DialogDescription>
                Comparte esta contraseña temporal con {result.usuario.nombre} — no se volverá a mostrar. Se le
                pedirá cambiarla en su primer inicio de sesión.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <code className="text-sm font-medium text-foreground">{result.usuario.username}</code>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Contraseña temporal</p>
                  <code className="text-sm font-medium text-foreground">{result.temporaryPassword}</code>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button className="w-full" onClick={() => handleOpenChange(false)}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nuevo usuario del equipo</DialogTitle>
              <DialogDescription>
                Se creará con una contraseña temporal que deberá cambiar en su primer inicio de sesión.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" placeholder="asoto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="tesorero@iglesia.cl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input autoComplete="given-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apellido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input autoComplete="family-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input type="tel" autoComplete="tel" placeholder="+56 9 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TESORERO">Tesorero</SelectItem>
                          <SelectItem value="SECRETARIA">Secretaria</SelectItem>
                        </SelectContent>
                      </Select>
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
                  {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear usuario"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
