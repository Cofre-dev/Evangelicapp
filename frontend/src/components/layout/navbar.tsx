"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { API_URL, apiFetch, setCsrfToken } from "@/lib/api";
import { useAuthStore, type Rol } from "@/stores/auth-store";

// El wordmark "Evangelicapp" del header ya cumple la función de "Inicio" (es un <Link href="/">),
// por eso no se repite acá dentro del menú.
const NAV_LINKS: Record<Rol, { href: string; label: string }[]> = {
  PASTOR: [
    { href: "/agenda", label: "Agenda" },
    { href: "/finanzas", label: "Finanzas" },
    { href: "/notas", label: "Notas" },
    { href: "/usuarios", label: "Equipo" },
  ],
  TESORERO: [
    { href: "/agenda", label: "Agenda" },
    { href: "/finanzas", label: "Finanzas" },
  ],
  SECRETARIA: [{ href: "/agenda", label: "Agenda" }],
  SUPER_ADMIN: [{ href: "/superadmin", label: "Dashboard" }],
  MIEMBRO: [],
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useAuthStore((state) => state.usuario);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
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

  const links = usuario ? (NAV_LINKS[usuario.rol] ?? []) : [];

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
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">@{usuario.username}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Abrir menú de navegación"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>

      {usuario && (
        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent
            className="inset-y-0 right-0 left-auto top-0 h-full w-[85vw] max-w-xs translate-x-0 translate-y-0 rounded-none rounded-l-2xl border-y-0 border-r-0 p-6 sm:max-w-sm data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 duration-300"
          >
            <DialogTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Menú
            </DialogTitle>

            <div className="flex flex-col gap-4 pt-2">
              {usuario.iglesia && (
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  {usuario.iglesia.logoUrl ? (
                    <Image
                      src={`${API_URL}${usuario.iglesia.logoUrl}`}
                      alt={`Logo de ${usuario.iglesia.nombre}`}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{usuario.iglesia.nombre}</span>
                </div>
              )}

              <nav className="flex flex-col gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={
                      pathname === link.href
                        ? "rounded-md bg-accent px-3 py-2 text-sm font-medium text-primary"
                        : "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    }
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <p className="border-t border-border pt-4 text-sm text-muted-foreground">@{usuario.username}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </header>
  );
}
