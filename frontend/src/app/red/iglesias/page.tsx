"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IglesiaLogo } from "@/components/iglesias/iglesia-logo";
import { AlianzaAccion } from "@/components/red/alianza-accion";
import { puedeEscribirRed } from "@/components/red/permisos";
import { RegionComunaSelect } from "@/components/red/region-comuna-select";
import type { EstadoAlianzaVista, ItemDirectorio, Paginado } from "@/components/red/types";
import { VerificadaBadge } from "@/components/red/verificada-badge";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";
import { useRedStore } from "@/stores/red-store";

interface Filtros {
  region: string;
  comuna: string;
}

export default function DirectorioPage() {
  const { usuario } = useRequireAuth();
  const perfil = useRedStore((s) => s.perfil);
  const perfilCargado = useRedStore((s) => s.perfilCargado);

  // `null` hasta conocer la comuna propia: por defecto el directorio filtra
  // por ella (se espera al perfil para no hacer un fetch sin filtros de más).
  const [filtros, setFiltros] = useState<Filtros | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<ItemDirectorio[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const escribe = puedeEscribirRed(usuario);

  useEffect(() => {
    if (filtros !== null || !perfilCargado) return;
    setFiltros(perfil ? { region: perfil.region, comuna: perfil.comuna } : { region: "", comuna: "" });
  }, [filtros, perfil, perfilCargado]);

  // Búsqueda por nombre con debounce de 300 ms.
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const pedirPagina = useCallback(
    (p: number) => {
      const params = new URLSearchParams({ pagina: String(p) });
      if (filtros?.region) params.set("region", filtros.region);
      if (filtros?.comuna) params.set("comuna", filtros.comuna);
      if (q) params.set("q", q);
      return apiFetch<Paginado<ItemDirectorio>>(`/red/iglesias?${params.toString()}`);
    },
    [filtros, q],
  );

  useEffect(() => {
    if (!usuario || filtros === null) return;
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
        if (!cancelado) setError(err instanceof ApiError ? err.message : "No se pudo cargar el directorio");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [usuario, filtros, pedirPagina]);

  async function cargarMas() {
    setCargandoMas(true);
    try {
      const res = await pedirPagina(pagina + 1);
      setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p.iglesiaId === n.iglesiaId))]);
      setTotal(res.total);
      setPagina(pagina + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron cargar más iglesias");
    } finally {
      setCargandoMas(false);
    }
  }

  function actualizarAlianza(iglesiaId: string, alianza: EstadoAlianzaVista) {
    setItems((prev) => prev.map((i) => (i.iglesiaId === iglesiaId ? { ...i, alianza } : i)));
  }

  if (!usuario) return null;

  const enMiComuna = Boolean(perfil && filtros?.comuna === perfil.comuna && filtros.region === perfil.region);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Directorio de iglesias</h1>
      <p className="mt-1 text-sm text-muted-foreground">Encuentra iglesias de tu zona y solicítales una alianza.</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="buscar-iglesia-red">Buscar por nombre</Label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="buscar-iglesia-red"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre de la iglesia…"
              autoComplete="off"
              className="pl-9"
            />
          </div>
        </div>
        <RegionComunaSelect
          idPrefix="directorio"
          permitirTodas
          region={filtros?.region ?? ""}
          comuna={filtros?.comuna ?? ""}
          onChange={setFiltros}
          disabled={filtros === null}
        />
        <div className="flex flex-wrap gap-2">
          {perfil && !enMiComuna && (
            <Button type="button" size="sm" variant="outline" onClick={() => setFiltros({ region: perfil.region, comuna: perfil.comuna })}>
              Mi comuna
            </Button>
          )}
          {perfil && (filtros?.comuna || filtros?.region !== perfil.region) && (
            <Button type="button" size="sm" variant="outline" onClick={() => setFiltros({ region: perfil.region, comuna: "" })}>
              Ver toda la región
            </Button>
          )}
          {(filtros?.region || filtros?.comuna) && (
            <Button type="button" size="sm" variant="outline" onClick={() => setFiltros({ region: "", comuna: "" })}>
              Ver todo el país
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando iglesias…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {q ? "Ninguna iglesia coincide con esa búsqueda." : "Aún no hay otras iglesias en esta zona."}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i.iglesiaId} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <IglesiaLogo logoUrl={i.logoUrl} nombre={i.nombre} size={44} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/red/iglesias/${i.iglesiaId}`} className="font-medium text-foreground hover:underline">
                      {i.nombre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {i.comuna}, {i.region}
                    </p>
                    <VerificadaBadge verificada={i.verificada} className="mt-1.5" />
                  </div>
                </div>
                {i.descripcion && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{i.descripcion}</p>}
                <div className="mt-auto pt-4">
                  <AlianzaAccion
                    iglesiaId={i.iglesiaId}
                    nombre={i.nombre}
                    alianza={i.alianza}
                    puedeEscribir={escribe}
                    onCambio={(a) => actualizarAlianza(i.iglesiaId, a)}
                  />
                </div>
              </li>
            ))}
          </ul>
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
