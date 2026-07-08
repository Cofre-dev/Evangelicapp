"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, FileClock, Loader2, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogsDialog } from "@/components/finanzas/logs-dialog";
import { MovimientoDialog } from "@/components/finanzas/movimiento-dialog";
import { formatoCLP, MEDIO_PAGO_LABEL, type Categoria, type FinanzasDashboard, type Movimiento } from "@/components/finanzas/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { API_URL, ApiError, apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const ROLES_CON_ACCESO = ["PASTOR", "TESORERO"];

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "positivo" | "negativo" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={
          tone === "positivo"
            ? "mt-2 text-2xl font-semibold text-emerald-600"
            : tone === "negativo"
              ? "mt-2 text-2xl font-semibold text-amber-600"
              : "mt-2 text-2xl font-semibold text-foreground"
        }
      >
        {formatoCLP.format(value)}
      </p>
    </div>
  );
}

function CategoriaBars({ data, colorClass }: { data: { categoria: string; total: number }[]; colorClass: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin movimientos en este período.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.categoria} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-foreground">{d.categoria}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${Math.max((d.total / max) * 100, 4)}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-sm font-medium text-foreground">
            {formatoCLP.format(d.total)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FinanzasPage() {
  const { usuario, ready } = useRequireAuth();
  const accessToken = useAuthStore((state) => state.accessToken);

  const [mes, setMes] = useState(() => new Date());
  const [dashboard, setDashboard] = useState<FinanzasDashboard | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<Movimiento | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const rangoMes = useCallback(() => {
    const from = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const to = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
  }, [mes]);

  const loadDatos = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    const { from, to } = rangoMes();
    const query = `from=${from.toISOString()}&to=${to.toISOString()}`;

    try {
      const [dashboardData, movimientosData, categoriasData] = await Promise.all([
        apiFetch<FinanzasDashboard>(`/finanzas/movimientos/dashboard?${query}`, { token: accessToken }),
        apiFetch<Movimiento[]>(`/finanzas/movimientos?${query}`, { token: accessToken }),
        apiFetch<Categoria[]>("/finanzas/categorias", { token: accessToken }),
      ]);
      setDashboard(dashboardData);
      setMovimientos(movimientosData);
      setCategorias(categoriasData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar la información financiera");
    } finally {
      setLoading(false);
    }
  }, [accessToken, rangoMes]);

  useEffect(() => {
    loadDatos();
  }, [loadDatos]);

  function abrirCreacion() {
    setMovimientoSeleccionado(null);
    setDialogOpen(true);
  }

  function abrirEdicion(movimiento: Movimiento) {
    setMovimientoSeleccionado(movimiento);
    setDialogOpen(true);
  }

  function agregarCategoria(categoria: Categoria) {
    setCategorias((prev) => [...prev, categoria]);
  }

  async function exportarExcel() {
    if (!accessToken) return;
    setExportando(true);
    setError(null);

    try {
      const { from, to } = rangoMes();
      const res = await fetch(
        `${API_URL}/finanzas/movimientos/exportar?from=${from.toISOString()}&to=${to.toISOString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movimientos-${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo exportar el archivo");
    } finally {
      setExportando(false);
    }
  }

  if (!ready || !usuario) {
    return null;
  }

  if (!ROLES_CON_ACCESO.includes(usuario.rol)) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para ver esta página.</p>
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="h-full bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Finanzas</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ingresos y egresos de la iglesia.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLogsOpen(true)}>
              <FileClock className="h-4 w-4" />
              Logs
            </Button>
            <Button variant="outline" onClick={exportarExcel} disabled={exportando}>
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar
            </Button>
            <Button onClick={abrirCreacion}>
              <Plus className="h-4 w-4" />
              Nuevo movimiento
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="w-48 text-center text-sm font-medium text-foreground">
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </p>
          <Button
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => setMes((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : dashboard ? (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile label="Ingresos" value={dashboard.totales.ingresos} tone="positivo" />
              <StatTile label="Egresos" value={dashboard.totales.egresos} tone="negativo" />
              <StatTile label="Balance" value={dashboard.totales.balance} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-sm font-medium text-foreground">Ingresos por categoría</h2>
                <div className="mt-4">
                  <CategoriaBars data={dashboard.porCategoriaIngreso} colorClass="bg-emerald-400" />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-sm font-medium text-foreground">Egresos por categoría</h2>
                <div className="mt-4">
                  <CategoriaBars data={dashboard.porCategoriaEgreso} colorClass="bg-amber-400" />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-6 pb-0">
                <h2 className="text-sm font-medium text-foreground">Movimientos</h2>
              </div>
              {movimientos.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">Sin movimientos en este período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Medio</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((m) => (
                      <TableRow key={m.id} className="cursor-pointer" onClick={() => abrirEdicion(m)}>
                        <TableCell className="text-muted-foreground">
                          {new Date(m.fecha).toLocaleDateString("es-CL")}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              m.tipo === "INGRESO"
                                ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                                : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                            }
                          >
                            {m.tipo === "INGRESO" ? "Ingreso" : "Egreso"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{MEDIO_PAGO_LABEL[m.medioPago]}</TableCell>
                        <TableCell className="text-foreground">{m.categoria.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{m.descripcion}</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatoCLP.format(Number(m.monto))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        ) : null}
      </div>

      <MovimientoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        movimiento={movimientoSeleccionado}
        categorias={categorias}
        onCategoriaCreada={agregarCategoria}
        onSaved={loadDatos}
        onDeleted={loadDatos}
      />

      <LogsDialog open={logsOpen} onOpenChange={setLogsOpen} />
    </main>
  );
}
