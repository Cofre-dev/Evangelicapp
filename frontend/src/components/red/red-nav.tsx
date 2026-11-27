"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useRedStore } from "@/stores/red-store";

const TABS = [
  { href: "/red", label: "Feed", activo: (p: string) => p === "/red" || p.startsWith("/red/llamados") },
  { href: "/red/mis-llamados", label: "Mis llamados", activo: (p: string) => p === "/red/mis-llamados" },
  { href: "/red/apoyos", label: "Mis apoyos", activo: (p: string) => p === "/red/apoyos" },
  { href: "/red/iglesias", label: "Directorio", activo: (p: string) => p.startsWith("/red/iglesias") },
  { href: "/red/alianzas", label: "Alianzas", activo: (p: string) => p === "/red/alianzas" },
  { href: "/red/perfil", label: "Mi perfil", activo: (p: string) => p === "/red/perfil" },
];

/** Pestañas de la sección. En mobile hace scroll horizontal en vez de
 * partirse en dos filas. */
export function RedNav() {
  const pathname = usePathname();
  const pendientes = useRedStore((s) => s.pendientesRecibidas);

  return (
    <nav aria-label="Red de iglesias" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {TABS.map((tab) => {
          const activo = tab.activo(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  activo
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.href === "/red/alianzas" && pendientes > 0 && (
                  <span
                    className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground"
                    aria-label={`${pendientes} solicitudes recibidas`}
                  >
                    {pendientes > 9 ? "9+" : pendientes}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
