"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Check, Clock, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import { puedeEscribirRed } from "@/components/red/permisos";
import type { MiPerfilRed } from "@/components/red/types";
import { VerificadaBadge } from "@/components/red/verificada-badge";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";
import { useRedStore } from "@/stores/red-store";

const perfilSchema = z.object({
  descripcion: z.string().trim().max(1000, "Máximo 1000 caracteres"),
  emailContacto: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "Ingresa un correo válido"),
  telefonoContacto: z.string().trim().max(30, "Máximo 30 caracteres"),
  sitioWeb: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/[^\s]+\.[^\s]+$/.test(v), "Debe empezar con https:// (ej. https://miiglesia.cl)"),
  visible: z.boolean(),
});

type PerfilValues = z.infer<typeof perfilSchema>;

function valoresDesde(perfil: MiPerfilRed): PerfilValues {
  return {
    descripcion: perfil.descripcion ?? "",
    emailContacto: perfil.emailContacto ?? "",
    telefonoContacto: perfil.telefonoContacto ?? "",
    sitioWeb: perfil.sitioWeb ?? "",
    visible: perfil.visible,
  };
}

export default function MiPerfilRedPage() {
  const { usuario } = useRequireAuth();
  const perfil = useRedStore((s) => s.perfil);
  const perfilCargado = useRedStore((s) => s.perfilCargado);
  const setPerfil = useRedStore((s) => s.setPerfil);

  const [serverError, setServerError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const escribe = puedeEscribirRed(usuario);

  const form = useForm<PerfilValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { descripcion: "", emailContacto: "", telefonoContacto: "", sitioWeb: "", visible: true },
  });

  useEffect(() => {
    if (perfil) form.reset(valoresDesde(perfil));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id]);

  async function onSubmit(values: PerfilValues) {
    setServerError(null);
    setGuardado(false);
    try {
      const actualizado = await apiFetch<MiPerfilRed>("/red/perfil", {
        method: "PATCH",
        // Vacío → `null` (el backend lo borra).
        body: JSON.stringify({
          descripcion: values.descripcion || null,
          emailContacto: values.emailContacto || null,
          telefonoContacto: values.telefonoContacto || null,
          sitioWeb: values.sitioWeb || null,
          visible: values.visible,
        }),
      });
      setPerfil(actualizado);
      form.reset(valoresDesde(actualizado));
      setGuardado(true);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "No se pudo guardar el perfil");
    }
  }

  if (!usuario) return null;

  if (!perfil) {
    return perfilCargado ? (
      <Alert variant="destructive">
        <AlertDescription>No se pudo cargar el perfil de tu iglesia en la red.</AlertDescription>
      </Alert>
    ) : (
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando…
      </div>
    );
  }

  const descripcionPreview = form.watch("descripcion");
  const visible = form.watch("visible");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mi perfil en la red</h1>
        <p className="mt-1 text-sm text-muted-foreground">Así te ven las demás iglesias en el directorio.</p>
      </div>

      <section aria-label="Vista previa" className="rounded-2xl border border-dashed border-border bg-muted/40 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Vista previa</p>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <IglesiaLogo logoUrl={perfil.logoUrl} nombre={perfil.nombre} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{perfil.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {perfil.comuna}, {perfil.region}
              </p>
              <VerificadaBadge verificada={perfil.verificada} className="mt-1.5" />
            </div>
          </div>
          {descripcionPreview.trim() && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{descripcionPreview}</p>
          )}
        </div>
        {!visible && (
          <p className="mt-3 text-xs text-muted-foreground">
            Tu iglesia no aparece en el listado del directorio. Igual puede publicar y apoyar llamados.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        {perfil.verificada ? (
          <p className="flex items-center gap-2 text-sm font-medium text-sky-700">
            <BadgeCheck className="h-5 w-5" aria-hidden />
            Verificada
          </p>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Sin verificar: el equipo de Evangelicapp revisará tu iglesia. Mientras tanto puedes usar la red con
            normalidad.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4" onChange={() => setGuardado(false)}>
            <fieldset disabled={!escribe} className="space-y-4">
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        maxLength={1000}
                        placeholder="Quiénes son, qué ministerios tienen, en qué acciones sociales participan…"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-right">{field.value.length}/1000</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="emailContacto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo de contacto</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefonoContacto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de contacto</FormLabel>
                      <FormControl>
                        <Input type="tel" autoComplete="tel" maxLength={30} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="sitioWeb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sitio web</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visible"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
                    <div>
                      <FormLabel>Aparecer en el directorio</FormLabel>
                      <FormDescription>Si lo apagas, tu iglesia no sale en el listado de búsqueda.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(v) => {
                          field.onChange(v);
                          setGuardado(false);
                        }}
                        disabled={!escribe}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </fieldset>

            <p className="text-xs text-muted-foreground">
              El nombre, la comuna y el logo se editan en{" "}
              {escribe ? (
                <Link href="/mi-iglesia" className="font-medium text-primary hover:underline">
                  Mi iglesia
                </Link>
              ) : (
                "Mi iglesia"
              )}{" "}
              y se sincronizan solos.
            </p>

            {!escribe && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Solo el pastor o administrador de la iglesia puede editar este perfil.
              </p>
            )}

            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            {escribe && (
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Guardar cambios"}
                </Button>
                {guardado && (
                  <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                    <Check className="h-4 w-4" />
                    Guardado
                  </span>
                )}
              </div>
            )}
          </form>
        </Form>
      </section>
    </div>
  );
}
