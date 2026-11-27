"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { fechaInputAIso } from "@/components/red/format";
import { puedeEscribirRed } from "@/components/red/permisos";
import { RegionComunaSelect } from "@/components/red/region-comuna-select";
import {
  TIPO_LLAMADO_LABEL,
  TIPO_NECESIDAD_LABEL,
  UNIDADES_SUGERIDAS,
  type CreateLlamadoBody,
  type LlamadoDetalle,
  type TipoLlamado,
  type TipoNecesidad,
  type VisibilidadLlamado,
} from "@/components/red/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRedStore } from "@/stores/red-store";

const MAX_NECESIDADES = 10;

const TIPOS_LLAMADO = Object.keys(TIPO_LLAMADO_LABEL) as [TipoLlamado, ...TipoLlamado[]];
const TIPOS_NECESIDAD = Object.keys(TIPO_NECESIDAD_LABEL) as [TipoNecesidad, ...TipoNecesidad[]];
const VISIBILIDADES = ["COMUNA", "REGION", "NACIONAL", "ALIADAS"] as const;

const necesidadSchema = z.object({
  descripcion: z.string().trim().min(1, "Describe la necesidad").max(200, "Máximo 200 caracteres"),
  tipo: z.enum(TIPOS_NECESIDAD),
  cantidadMeta: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1), "Debe ser un número entero mayor a 0"),
  unidad: z.string().trim().max(30, "Máximo 30 caracteres"),
});

const llamadoSchema = z
  .object({
    titulo: z.string().trim().min(1, "Ingresa un título").max(150, "Máximo 150 caracteres"),
    descripcion: z.string().trim().min(1, "Describe el llamado").max(3000, "Máximo 3000 caracteres"),
    tipo: z.enum(TIPOS_LLAMADO, { errorMap: () => ({ message: "Selecciona un tipo" }) }),
    visibilidad: z.enum(VISIBILIDADES),
    otraComuna: z.boolean(),
    region: z.string(),
    comuna: z.string(),
    direccion: z.string().trim().max(200, "Máximo 200 caracteres"),
    fechaInicio: z.string(),
    fechaFin: z.string(),
    necesidades: z.array(necesidadSchema).max(MAX_NECESIDADES),
  })
  .superRefine((v, ctx) => {
    if (v.otraComuna && !v.region) ctx.addIssue({ code: "custom", path: ["region"], message: "Selecciona una región" });
    if (v.otraComuna && !v.comuna) ctx.addIssue({ code: "custom", path: ["comuna"], message: "Selecciona una comuna" });
    // YYYY-MM-DD: la comparación de strings coincide con la cronológica.
    if (v.fechaInicio && v.fechaFin && v.fechaFin < v.fechaInicio) {
      ctx.addIssue({ code: "custom", path: ["fechaFin"], message: "No puede ser anterior a la fecha de inicio" });
    }
  });

type LlamadoValues = z.infer<typeof llamadoSchema>;

const NECESIDAD_VACIA: LlamadoValues["necesidades"][number] = {
  descripcion: "",
  tipo: "VOLUNTARIOS",
  cantidadMeta: "",
  unidad: "",
};

export default function NuevoLlamadoPage() {
  const { usuario } = useRequireAuth();
  const router = useRouter();
  const perfil = useRedStore((s) => s.perfil);
  const aliadas = useRedStore((s) => s.aliadas);
  const cargarLimites = useRedStore((s) => s.cargarLimites);

  const [serverError, setServerError] = useState<string | null>(null);
  const [limitePlan, setLimitePlan] = useState<string | null>(null);

  const form = useForm<LlamadoValues>({
    resolver: zodResolver(llamadoSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      tipo: undefined,
      visibilidad: "COMUNA",
      otraComuna: false,
      region: "",
      comuna: "",
      direccion: "",
      fechaInicio: "",
      fechaFin: "",
      necesidades: [],
    },
  });
  const necesidades = useFieldArray({ control: form.control, name: "necesidades" });

  const otraComuna = form.watch("otraComuna");
  const region = form.watch("region");
  const comuna = form.watch("comuna");

  if (!usuario) return null;

  if (!puedeEscribirRed(usuario)) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">Solo el pastor o administrador de la iglesia puede publicar llamados.</p>
        <Button asChild variant="link">
          <Link href="/red">Volver al feed</Link>
        </Button>
      </div>
    );
  }

  const comunaLabel = perfil?.comuna ?? "tu comuna";
  const regionLabel = perfil?.region ?? "tu región";

  const OPCIONES_VISIBILIDAD: { value: VisibilidadLlamado; titulo: string; ayuda: string; disabled?: boolean }[] = [
    { value: "COMUNA", titulo: "Mi comuna", ayuda: `Iglesias de ${comunaLabel}` },
    { value: "REGION", titulo: "Mi región", ayuda: `Iglesias de la región ${regionLabel}` },
    { value: "NACIONAL", titulo: "Todo el país", ayuda: "Todo el país (se avisa solo a tu región)" },
    { value: "ALIADAS", titulo: "Solo aliadas", ayuda: "Solo iglesias aliadas", disabled: aliadas === 0 },
  ];

  async function onSubmit(values: LlamadoValues) {
    setServerError(null);
    setLimitePlan(null);

    const body: CreateLlamadoBody = {
      titulo: values.titulo,
      descripcion: values.descripcion,
      tipo: values.tipo,
      visibilidad: values.visibilidad,
      ...(values.otraComuna ? { region: values.region, comuna: values.comuna } : {}),
      direccion: values.direccion || undefined,
      fechaInicio: fechaInputAIso(values.fechaInicio),
      fechaFin: fechaInputAIso(values.fechaFin),
      necesidades: values.necesidades.length
        ? values.necesidades.map((n) => ({
            descripcion: n.descripcion,
            tipo: n.tipo,
            cantidadMeta: n.cantidadMeta ? Number(n.cantidadMeta) : undefined,
            unidad: n.unidad || undefined,
          }))
        : undefined,
    };

    try {
      const creado = await apiFetch<LlamadoDetalle>("/red/llamados", { method: "POST", body: JSON.stringify(body) });
      toast("Llamado publicado. Avisamos a las iglesias de tu zona.");
      void cargarLimites();
      router.push(`/red/llamados/${creado.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "LIMITE_PLAN") {
        setLimitePlan(err.message);
        return;
      }
      setServerError(err instanceof ApiError ? err.message : "No se pudo publicar el llamado");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/red" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Volver al feed
      </Link>
      <h1 className="text-xl font-semibold text-foreground">Publicar llamado de ayuda</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cuéntale a las iglesias qué operativo o acción social organizan y qué necesitan concretamente.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-6 space-y-6">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input maxLength={150} placeholder="Operativo de invierno en la población" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea rows={5} maxLength={3000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS_LLAMADO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TIPO_LLAMADO_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <FormField
              control={form.control}
              name="visibilidad"
              render={({ field }) => (
                <FormItem>
                  <p id="visibilidad-label" className="text-sm font-medium text-foreground">
                    ¿Quién lo ve?
                  </p>
                  <div role="radiogroup" aria-labelledby="visibilidad-label" className="grid gap-2 sm:grid-cols-2">
                    {OPCIONES_VISIBILIDAD.map((op) => (
                      <label
                        key={op.value}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                          field.value === op.value ? "border-primary bg-accent/50" : "border-border hover:bg-accent/30",
                          op.disabled && "cursor-not-allowed opacity-60 hover:bg-transparent",
                        )}
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={op.value}
                          checked={field.value === op.value}
                          onChange={() => field.onChange(op.value)}
                          disabled={op.disabled}
                          className="mt-1 accent-[hsl(var(--primary))]"
                        />
                        <span>
                          <span className="block text-sm font-medium text-foreground">{op.titulo}</span>
                          <span className="block text-xs text-muted-foreground">{op.ayuda}</span>
                          {op.disabled && (
                            <Link href="/red/iglesias" className="mt-1 block text-xs font-medium text-primary hover:underline">
                              Aún no tienes aliadas: búscalas en el directorio
                            </Link>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Lugar</p>
                <p className="text-xs text-muted-foreground">
                  {otraComuna ? "Elige la comuna donde ocurre." : `Por defecto, ${comunaLabel}.`}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm text-foreground">
                <Switch
                  checked={otraComuna}
                  onCheckedChange={(v) => {
                    form.setValue("otraComuna", v);
                    if (!v) {
                      form.setValue("region", "");
                      form.setValue("comuna", "");
                      form.clearErrors(["region", "comuna"]);
                    }
                  }}
                  aria-label="Ocurre en otra comuna"
                />
                Ocurre en otra comuna
              </label>
            </div>
            {otraComuna && (
              <RegionComunaSelect
                idPrefix="llamado"
                region={region}
                comuna={comuna}
                onChange={(v) => {
                  form.setValue("region", v.region, { shouldValidate: form.formState.isSubmitted });
                  form.setValue("comuna", v.comuna, { shouldValidate: form.formState.isSubmitted });
                }}
                errorRegion={form.formState.errors.region?.message}
                errorComuna={form.formState.errors.comuna?.message}
              />
            )}
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Input maxLength={200} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fechaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término (opcional)</FormLabel>
                    <FormControl>
                      <Input type="date" min={form.watch("fechaInicio") || undefined} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div>
              <p className="text-sm font-medium text-foreground">Necesidades</p>
              <p className="text-xs text-muted-foreground">
                Lo concreto que necesitan (ej. &ldquo;20 voluntarios&rdquo;, &ldquo;100 kg de alimentos&rdquo;). Hasta{" "}
                {MAX_NECESIDADES}. Las necesidades no se pueden editar después de publicar.
              </p>
            </div>

            <datalist id="unidades-sugeridas">
              {UNIDADES_SUGERIDAS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>

            {necesidades.fields.map((campo, index) => (
              <div key={campo.id} className="space-y-3 rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Necesidad {index + 1}</p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => necesidades.remove(index)}
                    aria-label={`Quitar necesidad ${index + 1}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`necesidades.${index}.descripcion`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Input maxLength={200} placeholder="Voluntarios para repartir" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name={`necesidades.${index}.tipo`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPOS_NECESIDAD.map((t) => (
                              <SelectItem key={t} value={t}>
                                {TIPO_NECESIDAD_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`necesidades.${index}.cantidadMeta`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta (opcional)</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="numeric" min={1} step={1} placeholder="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`necesidades.${index}.unidad`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidad (opcional)</FormLabel>
                        <FormControl>
                          <Input list="unidades-sugeridas" maxLength={30} placeholder="personas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            {necesidades.fields.length < MAX_NECESIDADES && (
              <Button type="button" variant="outline" size="sm" onClick={() => necesidades.append(NECESIDAD_VACIA)}>
                <Plus aria-hidden />
                Agregar necesidad
              </Button>
            )}
          </section>

          <p className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            No se aceptan donaciones en dinero por este medio.
          </p>

          {limitePlan && (
            <Alert variant="destructive">
              <AlertDescription>
                {limitePlan}{" "}
                <Link href="/facturacion" className="font-medium underline">
                  Ver planes
                </Link>
              </AlertDescription>
            </Alert>
          )}
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild type="button" variant="outline">
              <Link href="/red">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Publicar llamado"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
