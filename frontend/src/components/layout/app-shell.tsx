"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

const RUTAS_SIN_SHELL = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ocultarShell =
    RUTAS_SIN_SHELL.includes(pathname) ||
    pathname.startsWith("/predicacion/") ||
    pathname.startsWith("/integrantes/registro/");

  if (ocultarShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
