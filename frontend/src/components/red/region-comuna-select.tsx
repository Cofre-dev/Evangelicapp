"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGIONES_CHILE } from "@/lib/chile-regiones";
import { cn } from "@/lib/utils";

// Radix Select no admite value="" — sentinel para "Todas" en modo filtro.
const TODAS = "__todas__";

interface RegionComunaSelectProps {
  region: string;
  comuna: string;
  onChange: (value: { region: string; comuna: string }) => void;
  /** Modo filtro: agrega "Todas" a ambos selects (valor ""). */
  permitirTodas?: boolean;
  idPrefix: string;
  disabled?: boolean;
  errorRegion?: string;
  errorComuna?: string;
  className?: string;
}

/** Selector en cascada contra el catálogo `chile-regiones.ts` (el backend
 * tiene una copia idéntica y rechaza con 400 cualquier valor fuera de él).
 * Nunca texto libre. */
export function RegionComunaSelect({
  region,
  comuna,
  onChange,
  permitirTodas = false,
  idPrefix,
  disabled,
  errorRegion,
  errorComuna,
  className,
}: RegionComunaSelectProps) {
  const comunas = REGIONES_CHILE.find((r) => r.region === region)?.comunas ?? [];

  const valorRegion = region || (permitirTodas ? TODAS : "");
  const valorComuna = comuna || (permitirTodas && region ? TODAS : "");

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-region`}>Región</Label>
        <Select
          value={valorRegion}
          onValueChange={(value) => onChange({ region: value === TODAS ? "" : value, comuna: "" })}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-region`} aria-invalid={Boolean(errorRegion)}>
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            {permitirTodas && <SelectItem value={TODAS}>Todas</SelectItem>}
            {REGIONES_CHILE.map((r) => (
              <SelectItem key={r.region} value={r.region}>
                {r.region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errorRegion && <p className="text-xs font-medium text-destructive">{errorRegion}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-comuna`}>Comuna</Label>
        <Select
          value={valorComuna}
          onValueChange={(value) => onChange({ region, comuna: value === TODAS ? "" : value })}
          disabled={disabled || !region}
        >
          <SelectTrigger id={`${idPrefix}-comuna`} aria-invalid={Boolean(errorComuna)}>
            <SelectValue placeholder={region ? "Selecciona" : "Elige región primero"} />
          </SelectTrigger>
          <SelectContent>
            {permitirTodas && <SelectItem value={TODAS}>Todas</SelectItem>}
            {comunas.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errorComuna && <p className="text-xs font-medium text-destructive">{errorComuna}</p>}
      </div>
    </div>
  );
}
