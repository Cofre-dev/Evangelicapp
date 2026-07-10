"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_URL, apiFetch, setCsrfToken } from "@/lib/api";
import { useAuthStore, type Rol } from "@/stores/auth-store";

const NAV_LINKS: Record<Rol, { href: string; label: string }[]> = {
  PASTOR: [
    { href: "/", label: "Inicio" },
    { href: "/agenda", label: "Agenda" },
    { href: "/finanzas", label: "Finanzas" },
    { href: "/notas", label: "Notas" },
    { href: "/usuarios", label: "Equipo" },
  ],
  TESORERO: [
    { href: "/", label: "Inicio" },
    { href: "/agenda", label: "Agenda" },
    { href: "/finanzas", label: "Finanzas" },
  ],
  SECRETARIA: [
    { href: "/", label: "Inicio" },
    { href: "/agenda", label: "Agenda" },
  ],
  SUPER_ADMIN: [
    { href: "/", label: "Inicio" },
    { href: "/superadmin", label: "Dashboard" },
  ],
  MIEMBRO: [{ href: "/", label: "Inicio" }],
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = useAuthStore((state) => state.usuario);
  const clearSession = useAuthStore((state) => state.clearSession);

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

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "rounded-md bg-accent px-3 py-2 text-sm font-medium text-primary"
                  : "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {usuario && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">@{usuario.username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
