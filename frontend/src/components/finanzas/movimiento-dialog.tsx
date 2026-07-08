"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Categoria, Movimiento, TipoMovimiento } from "./types";

const movimientoSchema = z.object({
  categoriaId: z.string().min(1, "Selecciona una categoría"),
  monto: z.coerce.number({ invalid_type_error: "Ingresa un monto" }).positive("Debe ser mayor a 0"),
  fecha: z.string().min(1, "Selecciona una fecha"),
  descripcion: z.string().optional(),
});

type MovimientoValues = z.infer<typeof movimientoSchema>;

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface MovimientoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimiento?: Movimiento | null;
  categorias: Categoria[];
  onCategoriaCreada: (categoria: Categoria) => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function MovimientoDialog({
  open,
  onOpenChange,
  movimiento,
  categorias,
  onCategoriaCreada,
  onSaved,
  onDeleted,
}: MovimientoDialogProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const esEdicion = Boolean(movimiento);

  const [tipo, setTipo] = useState<TipoMovimiento>("INGRESO");
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState("");
  const [creandoCategoriaLoading, setCreandoCategoriaLoading] = useState(false);
  // Copia local: al crear una categoría necesitamos que el nuevo <SelectItem>
  // exista en el MISMO render en que cambiamos el value seleccionado — si
  // dependiéramos solo del prop del padre, llegaría un render después y
  // Radix no tendría con qué mostrar la opción recién creada.
  const [categoriasLocal, setCategoriasLocal] = useState<Categoria[]>(categorias);
  // Radix Select solo registra sus <Item> mientras el dropdown está abierto —
  // si agregamos una categoría con el dropdown cerrado y le asignamos el value
  // por código, Radix nunca llega a registrarla y termina "corrigiendo" el
  // value de vuelta a "". Forzar un remount (cambiando key) resincroniza todo
  // en un solo golpe: value + opciones llegan juntos al Select nuevo.
  const [categoriaSelectKey, setCategoriaSelectKey] = useState(0);

  const form = useForm<MovimientoValues>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: { categoriaId: "", monto: 0, fecha: "", descripcion: "" },
  });

  useEffect(() => {
    if (!open) return;

    setServerError(null);
    setCreandoCategoria(false);
    setNombreNuevaCategoria("");
    setCategoriasLocal(categorias);
    setCategoriaSelectKey(0);

    if (movimiento) {
      setTipo(movimiento.tipo);
      form.reset({
        categoriaId: movimiento.categoria.id,
        monto: Number(movimiento.monto),
        fecha: toDateInputValue(new Date(movimiento.fecha)),
        descripcion: movimiento.descripcion ?? "",
      });
    } else {
      setTipo("INGRESO");
      form.reset({ categoriaId: "", monto: 0, fecha: toDateInputValue(new Date()), descripcion: "" });
    }
    // `categorias` a propósito no es dependencia: solo queremos tomar el snapshot
    // al abrir, no resetear el formulario cada vez que el padre actualiza su lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, movimiento, form]);

  const categoriasFiltradas = categoriasLocal.filter((c) => c.tipo === tipo);

  function cambiarTipo(nuevoTipo: TipoMovimiento) {
    setTipo(nuevoTipo);
    form.setValue("categoriaId", "");
  }

  async function crearCategoria() {
    if (!accessToken || !nombreNuevaCategoria.trim()) return;
    setCreandoCategoriaLoading(true);
    setServerError(null);

    try {
      const nueva = await apiFetch<Categoria>("/finanzas/categorias", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ nombre: nombreNuevaCategoria.trim(), tipo }),
      });

      setCategoriasLocal((prev) => [...prev, nueva]);
      onCategoriaCreada(nueva);
      form.setValue("categoriaId", nueva.id, { shouldValidate: true, shouldDirty: true });
      setCategoriaSelectKey((k) => k + 1);
      setNombreNuevaCategoria("");
      setCreandoCategoria(false);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "No se pudo crear la categoría");
    } finally {
      setCreandoCategoriaLoading(false);
    }
  }

  async function onSubmit(values: MovimientoValues) {
    if (!accessToken) return;
    setServerError(null);

    const body = {
      categoriaId: values.categoriaId,
      monto: values.monto,
      fecha: new Date(`${values.fecha}T00:00:00`).toISOString(),
      descripcion: values.descripcion || undefined,
    };

    try {
      await apiFetch(esEdicion ? `/finanzas/movimientos/${movimiento!.id}` : "/finanzas/movimientos", {
        method: esEdicion ? "PATCH" : "POST",
        token: accessToken,
        body: JSON.stringify(body),
      });

      onOpenChange(false);
      onSaved();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "No se pudo guardar el movimiento");
    }
  }

  async function handleDelete() {
    if (!accessToken || !movimiento) return;
    setDeleting(true);
    try {
      await apiFetch(`/finanzas/movimientos/${movimiento.id}`, { method: "DELETE", token: accessToken });
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "No se pudo eliminar el movimiento");
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
          <DialogDescription>Registra un ingreso o egreso con su categoría y fecha.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={tipo === "INGRESO" ? "default" : "outline"}
            onClick={() => cambiarTipo("INGRESO")}
          >
            Ingreso
          </Button>
          <Button type="button" variant={tipo === "EGRESO" ? "default" : "outline"} onClick={() => cambiarTipo("EGRESO")}>
            Egreso
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select key={categoriaSelectKey} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriasFiltradas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {creandoCategoria ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la categoría"
                  value={nombreNuevaCategoria}
                  onChange={(e) => setNombreNuevaCategoria(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={crearCategoria} disabled={creandoCategoriaLoading}>
                  {creandoCategoriaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCreandoCategoria(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreandoCategoria(true)}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva categoría
              </button>
            )}

            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
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

            <DialogFooter className="gap-2 sm:gap-2">
              {esEdicion && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Eliminar
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : esEdicion ? (
                  "Guardar cambios"
                ) : (
                  "Crear movimiento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
