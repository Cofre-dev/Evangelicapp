"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ContextoFinanzas, Departamento } from "./types";

const VALOR_GENERAL = "general";

interface DepartamentoSelectorProps {
  /** Ya filtrados a `activo: true` — los archivados no aparecen acá (siguen
   * accesibles solo si se llega directo por URL con su departamentoId). */
  departamentosActivos: Departamento[];
  contexto: ContextoFinanzas;
  esPastor: boolean;
}

export function DepartamentoSelector({ departamentosActivos, contexto, esPastor }: DepartamentoSelectorProps) {
  const router = useRouter();

  const value = contexto.tipo === "general" ? VALOR_GENERAL : contexto.id;

  function onValueChange(nextValue: string) {
    if (nextValue === VALOR_GENERAL) {
      router.push("/finanzas");
    } else {
      router.push(`/finanzas?departamentoId=${nextValue}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={VALOR_GENERAL}>Finanzas general</SelectItem>
          {departamentosActivos.map((dep) => (
            <SelectItem key={dep.id} value={dep.id}>
              {dep.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {esPastor && (
        <Button variant="outline" size="icon" aria-label="Gestionar departamentos" asChild>
          <Link href="/finanzas/departamentos">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
