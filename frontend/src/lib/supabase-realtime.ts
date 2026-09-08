import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase — usado EXCLUSIVAMENTE para el canal de Realtime
 * (`.channel()` / `.realtime`) de las 3 pantallas "en vivo" (ver
 * `src/hooks/use-realtime.ts` y `frontend/prompt.md`).
 *
 * Reemplaza al gateway propio de Socket.IO que mantenía el backend. Todo lo
 * demás sigue igual: los datos de negocio se piden con `apiFetch` (cookies
 * httpOnly contra el backend NestJS) y NO por este cliente — nada de
 * `supabase.from(...)`, auth de supabase, ni storage. Solo Realtime.
 *
 * `persistSession`/`autoRefreshToken` van en `false` a propósito: acá no hay
 * sesión de supabase-auth. La conexión de Realtime se autentica con un JWT
 * corto (HS256) que devuelve `GET /realtime/token` y que el hook renueva vía
 * `supabase.realtime.setAuth(token)` antes de cada expiración.
 *
 * Devuelve `null` si faltan las variables de entorno (entorno sin Realtime
 * configurado): el hook lo trata como "sin realtime" y las pantallas siguen
 * funcionando con su carga/refresh normal.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
