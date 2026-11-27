"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ApiError, apiFetch } from "@/lib/api";

interface Preferencias {
  notificacionesRedEmail: boolean;
}

/** `GET/PATCH /notificaciones/preferencias`: los avisos de la Red de iglesias
 * siempre llegan a la campana; este switch decide si además van por correo. */
export function PreferenciasNotificaciones() {
  const [prefs, setPrefs] = useState<Preferencias | null>(null);
  const [error, setError] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiFetch<Preferencias>("/notificaciones/preferencias")
      .then(setPrefs)
      .catch(() => setError(true));
  }, []);

  async function cambiar(valor: boolean) {
    if (!prefs) return;
    const anterior = prefs;
    setPrefs({ notificacionesRedEmail: valor });
    setGuardando(true);
    try {
      setPrefs(
        await apiFetch<Preferencias>("/notificaciones/preferencias", {
          method: "PATCH",
          body: JSON.stringify({ notificacionesRedEmail: valor }),
        }),
      );
    } catch (err) {
      setPrefs(anterior);
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar la preferencia");
    } finally {
      setGuardando(false);
    }
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">No se pudieron cargar tus preferencias.</p>;
  }

  if (!prefs) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando…
      </div>
    );
  }

  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-foreground">Recibir también por correo</span>
        <span className="block text-xs text-muted-foreground">
          Llamados nuevos en tu zona, apoyos a tus llamados y solicitudes de alianza.
        </span>
      </span>
      <Switch
        checked={prefs.notificacionesRedEmail}
        onCheckedChange={cambiar}
        disabled={guardando}
        aria-label="Recibir también por correo"
      />
    </label>
  );
}
