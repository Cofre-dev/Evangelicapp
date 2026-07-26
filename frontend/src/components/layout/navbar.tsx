"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ChevronDown, LogOut, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { API_URL, apiFetch, setCsrfToken } from "@/lib/api";
import { useAuthStore, type Rol } from "@/stores/auth-store";

/**
 * Un ítem de navegación es un link directo o un grupo colapsable con sub-links
 * (ej. "Ceremonias" ▾, que despliega sus 4 submódulos dentro del propio panel
 * lateral en vez de navegar a una página propia). Discriminado por `type` para
 * poder mezclar ambos dentro de la misma lista sin romper los links planos que
 * ya existían.
 */
type NavItem =
  | { type: "link"; href: string; label: string }
  | { type: "group"; label: string; children: { href: string; label: string }[] };

const CEREMONIAS_GRUPO: NavItem = {
  type: "group",
  label: "Ceremonias",
  children: [
    { href: "/ceremonias/matrimonios", label: "Matrimonios" },
    { href: "/ceremonias/bautizos", label: "Bautizos" },
    { href: "/ceremonias/defunciones", label: "Defunciones" },
    { href: "/ceremonias/presentaciones", label: "Presentaciones" },
  ],
};

const NAV_LINKS: Record<Rol, NavItem[]> = {
  PASTOR: [
    { type: "link", href: "/", label: "Inicio" },
    { type: "link", href: "/agenda", label: "Agenda" },
    { type: "link", href: "/finanzas", label: "Finanzas" },
    { type: "link", href: "/notas", label: "Notas" },
    { type: "link", href: "/usuarios", label: "Equipo" },
    { type: "link", href: "/integrantes", label: "Integrantes" },
    CEREMONIAS_GRUPO,
  ],
  TESORERO: [
    { type: "link", href: "/", label: "Inicio" },
    { type: "link", href: "/agenda", label: "Agenda" },
    { type: "link", href: "/finanzas", label: "Finanzas" },
  ],
  SECRETARIA: [
    { type: "link", href: "/", label: "Inicio" },
    { type: "link", href: "/agenda", label: "Agenda" },
    { type: "link", href: "/integrantes", label: "Integrantes" },
    CEREMONIAS_GRUPO,
  ],
  SUPER_ADMIN: [
    { type: "link", href: "/", label: "Inicio" },
    { type: "link", href: "/superadmin", label: "Dashboard" },
  ],
  MIEMBRO: [{ type: "link", href: "/", label: "Inicio" }],
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useAuthStore((state) => state.usuario);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [gruposAbiertos, setGruposAbiertos] = useState<Set<string>>(new Set());

  const links = usuario ? (NAV_LINKS[usuario.rol] ?? []) : [];

  // Si la ruta activa cae dentro de un grupo (ej. entrar directo a
  // /ceremonias/bautizos), lo expande automáticamente para que quede visible
  // al abrir el menú — sin esto, un grupo colapsado podría esconder la
  // sección en la que el usuario ya está parado.
  useEffect(() => {
    for (const link of links) {
      if (link.type === "group" && link.children.some((child) => pathname.startsWith(child.href))) {
        setGruposAbiertos((prev) => (prev.has(link.label) ? prev : new Set(prev).add(link.label)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGrupo(label: string) {
    setGruposAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  async function handleLogout() {
    setMenuAbierto(false);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // aunque el backend falle, igual cerramos la sesión local
    } finally {
      setCsrfToken(null);
      clearSession();
      router.replace("/login");
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold text-foreground">
            Evangelicapp
          </Link>

          {usuario?.iglesia && (
            <div className="hidden items-center gap-2 border-l border-border pl-6 sm:flex">
              {usuario.iglesia.logoUrl ? (
                <Image
                  src={`${API_URL}${usuario.iglesia.logoUrl}`}
                  alt={`Logo de ${usuario.iglesia.nombre}`}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-primary">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="text-sm text-muted-foreground">{usuario.iglesia.nombre}</span>
            </div>
          )}
        </div>

        {usuario && (
          <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-4/5 flex-col">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>

              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-accent/40 px-3 py-3">
                {usuario.iglesia?.logoUrl ? (
                  <Image
                    src={`${API_URL}${usuario.iglesia.logoUrl}`}
                    alt={`Logo de ${usuario.iglesia.nombre}`}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">@{usuario.username}</p>
                  {usuario.iglesia && (
                    <p className="truncate text-xs text-muted-foreground">{usuario.iglesia.nombre}</p>
                  )}
                </div>
              </div>

              {links.length > 0 && (
                <nav className="mt-4 flex flex-col gap-1">
                  {links.map((link) =>
                    link.type === "group" ? (
                      <div key={link.label}>
                        <button
                          type="button"
                          onClick={() => toggleGrupo(link.label)}
                          aria-expanded={gruposAbiertos.has(link.label)}
                          aria-controls={`grupo-nav-${link.label}`}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent/60 hover:text-foreground ${
                            link.children.some((child) => pathname === child.href)
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {link.label}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${gruposAbiertos.has(link.label) ? "rotate-180" : ""}`}
                          />
                        </button>
                        {gruposAbiertos.has(link.label) && (
                          <div id={`grupo-nav-${link.label}`} className="ml-3 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                            {link.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setMenuAbierto(false)}
                                className={
                                  pathname === child.href
                                    ? "rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-primary"
                                    : "rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                                }
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuAbierto(false)}
                        className={
                          pathname === link.href
                            ? "rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-primary"
                            : "rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                        }
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </nav>
              )}

              <div className="mt-auto border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2 text-destructive hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
}
