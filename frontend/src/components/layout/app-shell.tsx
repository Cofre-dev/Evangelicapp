"use client";

import { usePathname } from "next/navigation";
import { FacturacionAlertas } from "@/components/facturacion/facturacion-alertas";
import { esRutaDePago, iglesiaEnPlanGratuito } from "@/components/red/permisos";
import { UpsellPlanDialog, UpsellPlanPantalla } from "@/components/red/upsell-plan";
import { useActivityHeartbeat } from "@/hooks/use-activity-heartbeat";
import { useAuthStore } from "@/stores/auth-store";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

const RUTAS_SIN_SHELL = ["/login", "/politica-privacidad"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const usuario = useAuthStore((state) => state.usuario);

  // Se llama incondicionalmente (a diferencia de <FacturacionAlertas/>, un
  // hook no puede quedar detrás del early return de acá abajo — Rules of
  // Hooks). Se auto-gatea internamente (sesión + gates de password/onboarding),
  // así que no hace daño que también corra en las rutas públicas de abajo.
  useActivityHeartbeat();

  const ocultarShell =
    RUTAS_SIN_SHELL.includes(pathname) ||
    pathname.startsWith("/predicacion/") ||
    pathname.startsWith("/integrantes/registro/") ||
    pathname.startsWith("/recuperar-contrasena") ||
    // Links públicos que llegan por correo (sin sesión): estado de convocatoria
    // y RSVP de un integrante. Igual que /predicacion/, van sin navbar/footer.
    pathname.startsWith("/agenda/convocatoria/") ||
    pathname.startsWith("/agenda/asistencia/") ||
    // Link "Dejar de recibirlo" del reporte financiero mensual (sin sesión).
    pathname.startsWith("/reporte-financiero/") ||
    // Registro público de iglesias (plan GRATUITO) y su link de confirmación.
    pathname.startsWith("/registro");

  if (ocultarShell) {
    return <>{children}</>;
  }

  // Plan GRATUITO entrando por URL a un módulo de pago: se muestra el upsell
  // en vez de montar la página, así no se dispara ninguna request que el
  // backend vaya a rechazar con 403 `REQUIERE_PLAN_PAGO` (que igual tiene su
  // handler global en `apiFetch`, por si el plan cambia con la página abierta).
  const bloqueadaPorPlan = iglesiaEnPlanGratuito(usuario) && esRutaDePago(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <FacturacionAlertas />
      <div className="flex-1">{bloqueadaPorPlan ? <UpsellPlanPantalla /> : children}</div>
      <Footer />
      <UpsellPlanDialog />
    </div>
  );
}
