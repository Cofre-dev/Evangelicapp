"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateIglesiaDialog } from "@/components/iglesias/create-iglesia-dialog";
import { PLAN_BADGE_CLASSES, PLAN_LABEL, type PlanIglesia } from "@/components/iglesias/types";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { ApiError, apiFetch } from "@/lib/api";

interface DashboardResponse {
  totales: {
    iglesias: number;
    iglesiasActivas: number;
    pastores: number;
  };
  porRegion: { region: string; cantidad: number }[];
  iglesias: {
    id: string;
    nombre: string;
    comuna: string;
    region: string;
    logoUrl: string | null;
    estado: "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
    plan: PlanIglesia;
    createdAt: string;
    pastor: { nombre: string; apellido: string; email: string } | null;
  }[];
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value.toLocaleString("es-CL")}</p>
    </div>
  );
}

function RegionBars({ data }: { data: { region: string; cantidad: number }[] }) {
  const max = Math.max(...data.map((d) => d.cantidad), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.region} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-foreground">{d.region}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((d.cantidad / max) * 100, 4)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium text-foreground">{d.cantidad}</span>
        </div>
      ))}
    </div>
  );
}

function IglesiaLogo({ logoUrl, nombre }: { logoUrl: string | null; nombre: string }) {
  if (!logoUrl) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <Building2 className="h-4 w-4" />
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={`Logo de ${nombre}`}
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-full border border-border object-contain"
    />
  );
}

const ESTADO_LABEL: Record<DashboardResponse["iglesias"][number]["estado"], string> = {
  ACTIVA: "Activa",
  SUSPENDIDA: "Suspendida",
  INACTIVA: "Inactiva",
};

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { usuario, ready } = useRequireAuth();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!usuario) return;
    setError(null);

    try {
      const response = await apiFetch<DashboardResponse>("/superadmin/dashboard");
      setData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (!ready || !usuario) {
    return null;
  }

  if (usuario.rol !== "SUPER_ADMIN") {
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
            <h1 className="text-xl font-semibold text-foreground">Dashboard SuperAdmin</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vista global de todas las iglesias de la plataforma.</p>
          </div>
          <CreateIglesiaDialog onCreated={() => loadDashboard()} />
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando dashboard...
          </div>
        ) : data ? (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile label="Iglesias" value={data.totales.iglesias} />
              <StatTile label="Iglesias activas" value={data.totales.iglesiasActivas} />
              <StatTile label="Pastores" value={data.totales.pastores} />
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-sm font-medium text-foreground">Iglesias por región</h2>
              <div className="mt-4">
                {data.porRegion.length > 0 ? (
                  <RegionBars data={data.porRegion} />
                ) : (
                  <p className="text-sm text-muted-foreground">Todavía no hay iglesias registradas.</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm">
              <div className="p-6 pb-0">
                <h2 className="text-sm font-medium text-foreground">Iglesias</h2>
              </div>
              {data.iglesias.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">Aún no hay iglesias creadas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Iglesia</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Pastor</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.iglesias.map((iglesia) => (
                      <TableRow
                        key={iglesia.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/superadmin/iglesias/${iglesia.id}`)}
                      >
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <IglesiaLogo logoUrl={iglesia.logoUrl} nombre={iglesia.nombre} />
                            {iglesia.nombre}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {iglesia.comuna}, {iglesia.region}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {iglesia.pastor ? `${iglesia.pastor.nombre} ${iglesia.pastor.apellido}` : "Sin asignar"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(iglesia.createdAt).toLocaleDateString("es-CL")}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${PLAN_BADGE_CLASSES[iglesia.plan]}`}>
                            {PLAN_LABEL[iglesia.plan]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              iglesia.estado === "ACTIVA"
                                ? "rounded-full bg-accent px-2 py-1 text-xs font-medium text-primary"
                                : "rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                            }
                          >
                            {ESTADO_LABEL[iglesia.estado]}
                          </span>
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
    </main>
  );
}
