"use client";

import { forwardRef, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, Loader2, Lock, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RegionComunaSelect } from "@/components/red/region-comuna-select";
import { TURNSTILE_SITE_KEY, Turnstile, type TurnstileHandle } from "@/components/registro/turnstile";
import { ApiError, apiFetch } from "@/lib/api";
import { REGIONES_CHILE } from "@/lib/chile-regiones";
import logoMark from "@/img/photo/logo-mark.png";

const URL_POLITICA_PRIVACIDAD = process.env.NEXT_PUBLIC_URL_POLITICA_PRIVACIDAD || "/politica-privacidad";

// Mismas reglas que el backend (POST /red/registro) y que el alta de usuarios.
const USERNAME_REGEX = /^[a-z][a-z0-9._]{3,19}$/;

const registroSchema = z
  .object({
    nombreIglesia: z.string().trim().min(1, "Ingresa el nombre de la iglesia").max(150, "Máximo 150 caracteres"),
    region: z.string().min(1, "Selecciona una región"),
    comuna: z.string().min(1, "Selecciona una comuna"),
    direccion: z.string().trim().max(200, "Máximo 200 caracteres"),
    pastorNombre: z.string().trim().min(1, "Ingresa tu nombre").max(80, "Máximo 80 caracteres"),
    pastorApellido: z.string().trim().min(1, "Ingresa tu apellido").max(80, "Máximo 80 caracteres"),
    email: z.string().trim().min(1, "Ingresa tu correo").email("Ingresa un correo válido"),
    telefono: z.string().trim().max(30, "Máximo 30 caracteres"),
    username: z
      .string()
      .trim()
      .regex(USERNAME_REGEX, "4-20 caracteres: minúsculas, números, punto o guion bajo; empieza con letra"),
    password: z
      .string()
      .min(8, "Debe tener al menos 8 caracteres")
      .max(72, "Máximo 72 caracteres")
      .regex(/(?=.*[a-zA-Z])(?=.*[0-9])/, "Debe incluir al menos una letra y un número"),
    confirmPassword: z.string().min(1, "Repite la contraseña"),
    aceptaTerminos: z.boolean().refine((v) => v === true, "Debes aceptar los términos y la política de privacidad"),
  })
  .refine((v) => REGIONES_CHILE.some((r) => r.region === v.region && r.comunas.includes(v.comuna)), {
    message: "Selecciona una comuna de la región",
    path: ["comuna"],
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegistroValues = z.infer<typeof registroSchema>;

const INCLUYE = [
  "Directorio de iglesias por comuna y región",
  "Llamados de ayuda (hasta 2 abiertos a la vez)",
  "“¡Yo te ayudo!” para apoyar a otras iglesias",
  "Alianzas entre iglesias",
  "Notificaciones en la app y por correo",
];

function BloqueIncluye() {
  return (
    <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">¿Qué incluye el plan gratuito?</h2>
      <ul className="mt-3 space-y-2 text-sm text-foreground">
        {INCLUYE.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-4">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
          Es de pago
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Agenda, finanzas, ceremonias, integrantes y el resto de la plataforma.
        </p>
      </div>
    </aside>
  );
}

/** Input de contraseña con "ver/ocultar". `forwardRef` + spread de props para
 * que `FormControl` (Slot) le pase id/aria-* al <input> real. */
const CampoPassword = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function CampoPassword(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} {...props} type={visible ? "text" : "password"} className="pr-10" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

export default function RegistroIglesiaPage() {
  const [enviadoA, setEnviadoA] = useState<{ email: string; horas: number } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const form = useForm<RegistroValues>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      nombreIglesia: "",
      region: "",
      comuna: "",
      direccion: "",
      pastorNombre: "",
      pastorApellido: "",
      email: "",
      telefono: "",
      username: "",
      password: "",
      confirmPassword: "",
      aceptaTerminos: false,
    },
  });

  const region = form.watch("region");
  const comuna = form.watch("comuna");
  const requiereCaptcha = Boolean(TURNSTILE_SITE_KEY);

  async function onSubmit(values: RegistroValues) {
    setServerError(null);
    if (requiereCaptcha && !turnstileToken) {
      setServerError("Completa la verificación anti-spam antes de crear la cuenta.");
      return;
    }

    try {
      const res = await apiFetch<{ email: string; expiraEnHoras: number }>("/red/registro", {
        method: "POST",
        body: JSON.stringify({
          nombreIglesia: values.nombreIglesia,
          region: values.region,
          comuna: values.comuna,
          direccion: values.direccion || undefined,
          pastorNombre: values.pastorNombre,
          pastorApellido: values.pastorApellido,
          email: values.email.toLowerCase(),
          username: values.username,
          telefono: values.telefono || undefined,
          password: values.password,
          aceptaTerminos: true,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      setEnviadoA({ email: res.email, horas: res.expiraEnHoras ?? 24 });
      window.scrollTo({ top: 0 });
    } catch (err) {
      // El token de Turnstile es de un solo uso: tras cualquier error hay que
      // pedir uno nuevo.
      turnstileRef.current?.reset();

      if (err instanceof ApiError && err.status === 409) {
        const msg = err.message;
        if (/usuario/i.test(msg)) form.setError("username", { message: msg });
        else if (/correo|email/i.test(msg)) form.setError("email", { message: msg });
        else setServerError(msg);
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        setServerError("Demasiados intentos, espera unos minutos.");
        return;
      }
      setServerError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="h-1.5 bg-[linear-gradient(90deg,hsl(199_70%_52%),hsl(203_66%_42%))]" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <Link href="/login" className="flex items-center justify-center gap-2">
          <Image src={logoMark} alt="" priority className="h-8 w-8" />
          <p className="font-display text-lg italic text-primary">Evangelicapp</p>
        </Link>

        {enviadoA ? (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <MailCheck className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-foreground">Revisa tu correo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Te enviamos un enlace a <strong className="font-medium text-foreground">{enviadoA.email}</strong> para
              activar la cuenta. Vence en {enviadoA.horas} horas.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              ¿No te llegó? Revisa la carpeta de spam o{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  setEnviadoA(null);
                  turnstileRef.current?.reset();
                }}
              >
                vuelve a registrarte
              </button>
              .
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto mt-8 max-w-2xl text-center">
              <h1 className="font-display text-3xl italic text-primary sm:text-4xl">Registra tu iglesia gratis</h1>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                Únete a la Red de iglesias: encuentra iglesias de tu comuna y apóyense en sus acciones sociales.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
                >
                  <fieldset className="space-y-4">
                    <legend className="text-sm font-semibold text-foreground">Tu iglesia</legend>
                    <FormField
                      control={form.control}
                      name="nombreIglesia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la iglesia</FormLabel>
                          <FormControl>
                            <Input autoComplete="organization" maxLength={150} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <RegionComunaSelect
                      idPrefix="registro"
                      region={region}
                      comuna={comuna}
                      onChange={(v) => {
                        const validar = form.formState.isSubmitted;
                        form.setValue("region", v.region, { shouldValidate: validar });
                        form.setValue("comuna", v.comuna, { shouldValidate: validar });
                      }}
                      errorRegion={form.formState.errors.region?.message}
                      errorComuna={form.formState.errors.comuna?.message}
                    />
                    <FormField
                      control={form.control}
                      name="direccion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección (opcional)</FormLabel>
                          <FormControl>
                            <Input autoComplete="street-address" maxLength={200} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </fieldset>

                  <fieldset className="space-y-4 border-t border-border pt-6">
                    <legend className="text-sm font-semibold text-foreground">Pastor/a</legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="pastorNombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input autoComplete="given-name" maxLength={80} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pastorApellido"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellido</FormLabel>
                            <FormControl>
                              <Input autoComplete="family-name" maxLength={80} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl>
                              <Input type="email" autoComplete="email" {...field} />
                            </FormControl>
                            <FormDescription>Con este correo iniciarás sesión.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telefono"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono (opcional)</FormLabel>
                            <FormControl>
                              <Input type="tel" autoComplete="tel" maxLength={30} placeholder="+56 9 1234 5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de usuario</FormLabel>
                          <FormControl>
                            <Input
                              autoComplete="username"
                              autoCapitalize="none"
                              spellCheck={false}
                              maxLength={20}
                              placeholder="pastor.juan"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                            />
                          </FormControl>
                          <FormDescription>4-20 caracteres: minúsculas, números, punto o guion bajo.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <CampoPassword autoComplete="new-password" maxLength={72} {...field} />
                            </FormControl>
                            <FormDescription>Mínimo 8, con al menos una letra y un número.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repite la contraseña</FormLabel>
                            <FormControl>
                              <CampoPassword autoComplete="new-password" maxLength={72} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </fieldset>

                  <div className="space-y-4 border-t border-border pt-6">
                    <FormField
                      control={form.control}
                      name="aceptaTerminos"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-start gap-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                className="mt-0.5"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal leading-snug text-muted-foreground">
                              Acepto los términos y la{" "}
                              <a
                                href={URL_POLITICA_PRIVACIDAD}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-2 hover:no-underline"
                              >
                                política de privacidad
                              </a>
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Turnstile ref={turnstileRef} onToken={setTurnstileToken} />

                    {serverError && (
                      <Alert variant="destructive">
                        <AlertDescription>{serverError}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Crear cuenta"}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      ¿Ya tienes cuenta?{" "}
                      <Link href="/login" className="font-medium text-primary hover:underline">
                        Inicia sesión
                      </Link>
                    </p>
                  </div>
                </form>
              </Form>

              <BloqueIncluye />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
