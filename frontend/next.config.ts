import type { NextConfig } from "next";

// Las imágenes subidas (ej. logos de iglesia) se sirven desde el backend en
// NEXT_PUBLIC_API_URL. Se deriva de esa misma variable para no tener que
// tocar este archivo cuando cambie el dominio del backend en cada entorno.
const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol === "https:" ? "https" : "http",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/uploads/**",
      },
      // logoUrl/fotoUrl (Iglesia/Usuario/Integrante) ahora son URLs absolutas
      // de Supabase Storage (Fase 1 de docs/supabase.md), no rutas relativas
      // del backend. Bucket público, no requiere credenciales.
      {
        protocol: "https",
        hostname: "lkcgiqmgdefhxhckedga.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
