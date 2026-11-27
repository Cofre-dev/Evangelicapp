"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LlamadoCard } from "@/components/red/llamado-card";
import { puedeEscribirRed } from "@/components/red/permisos";
import {
  ALCANCE_LABEL,
  TIPO_LLAMADO_LABEL,
  type AlcanceFeed,
  type LlamadoResumen,
  type Paginado,
  type TipoLlamado,
} from "@/components/red/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRedStore } from "@/stores/red-store";

const ALCANCES: AlcanceFeed[] = ["TODO", "COMUNA", "REGION", "NACIONAL", "ALIADAS"];
const TODOS_LOS_TIPOS = "__todos__";

export default function RedFeedPage() {
  const { usuario } = useRequireAuth();
  const perfil = useRedStore((s) => s.perfil);
  const cupo = useRedStore((s) => s.llamadosAbiertos);
  const aliadas = useRedStore((s) => s.aliadas);
  const alianzasCargadas = useRedStore((s) => s.alianzasCargadas);

  const [alcance, setAlcance] = useState<AlcanceFeed>("TODO");
  const [tipo, setTipo] = useState<TipoLlamado | "">("");
  const [incluirCerrados, setIncluirCerrados] = useState(false);

  const [items, setItems] = useState<LlamadoResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const escribe = puedeEscribirRed(usuario);
  const cupoLleno = cupo !== null && cupo.actuales >= cupo.maximo;

  const pedirPagina = useCallback(
    (p: number) => {
      const params = new URLSearchParams({ alcance, pagina: String(p) });
      if (tipo) params.set("tipo", tipo);
      if (incluirCerrados) params.set("incluirCerrados", "true");
      return apiFetch<Paginado<LlamadoResumen>>(`/red/feed?${params.toString()}`);
    },
    [alcance, tipo, incluirCerrados],
  );

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;
    setLoading(true);
    setError(null);
    pedirPagina(1)
      .then((res) => {
        if (cancelado) return;
        setItems(res.items);
        setTotal(res.total);
        setPagina(1);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof ApiError ? err.message : "No se pudo cargar el feed");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [usuario, pedirPagina]);

  async function cargarMas() {
    setCargandoMas(true);
    try {
      const res = await pedirPagina(pagina + 1);
      setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p.id === n.id))]);
      setTotal(res.total);
      setPagina(pagina + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar más llamados");
    } finally {
      setCargandoMas(false);
    }
  }

  if (!usuario) return null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Red de iglesias</h1>
          {perfil && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {perfil.comuna}, {perfil.region}
            </p>
          )}
        </div>

        {escribe &&
          (cupoLleno ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                disabled
                title={`Tu plan permite ${cupo!.maximo} llamados abiertos a la vez`}
                aria-describedby="cupo-lleno-ayuda"
              >
                <Plus aria-hidden />
                Publicar llamado
              </Button>
              <p id="cupo-lleno-ayuda" className="text-xs text-muted-foreground">
                Llegaste a {cupo!.maximo} llamados abiertos.{" "}
                <Link href="/facturacion" className="font-medium text-primary hover:underline">
                  Ver planes
                </Link>
              </p>
            </div>
          ) : (
            <Button asChild>
              <Link href="/red/llamados/nuevo">
                <Plus aria-hidden />
                Publicar llamado
              </Link>
            </Button>
          ))}
      </div>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Alcance" className="inline-flex min-w-max gap-1 rounded-lg bg-muted p-1">
          {ALCANCES.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={alcance === a}
              onClick={() => setAlcance(a)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                alcance === a ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ALCANCE_LABEL[a]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full space-y-2 sm:w-56">
          <Label htmlFor="filtro-tipo">Tipo</Label>
          <Select
            value={tipo || TODOS_LOS_TIPOS}
            onValueChange={(v) => setTipo(v === TODOS_LOS_TIPOS ? "" : (v as TipoLlamado))}
          >
            <SelectTrigger id="filtro-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_LOS_TIPOS}>Todos los tipos</SelectItem>
              {(Object.keys(TIPO_LLAMADO_LABEL) as TipoLlamado[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TIPO_LLAMADO_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={incluirCerrados} onCheckedChange={setIncluirCerrados} aria-label="Incluir cerrados" />
          Incluir cerrados
        </label>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando llamados…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center sm:p-10">
          <p className="text-sm text-foreground">Aún no hay llamados en tu zona. ¡Sé la primera iglesia en publicar uno!</p>
          {alianzasCargadas && aliadas === 0 && (
            <Button asChild variant="link" className="mt-2">
              <Link href="/red/iglesias">Busca iglesias de tu comuna</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4">
            {items.map((llamado) => (
              <LlamadoCard key={llamado.id} llamado={llamado} />
            ))}
          </div>
          {items.length < total && (
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="outline" onClick={cargarMas} disabled={cargandoMas}>
                {cargandoMas ? <Loader2 className="animate-spin" /> : "Cargar más"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
