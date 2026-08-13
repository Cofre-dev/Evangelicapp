"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL, onSessionRefreshed } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

/**
 * WebSocket (Socket.IO) para las pantallas "en vivo" del backend — dashboard
 * SuperAdmin, evento del Pastor, censo QR (ver frontend/prompt.md, Fase 5 de
 * docs/supabase.md). No es Supabase Realtime: es un gateway propio del
 * backend sobre NestJS, autenticado con la misma cookie httpOnly
 * `access_token` que ya usa `apiFetch` (`withCredentials: true`, sin token a
 * mano). El servidor decide sola qué "room" le corresponde a cada conexión
 * según el rol/iglesia del JWT — acá no hay nada que filtrar.
 *
 * Se conecta mientras el componente llamante está montado y hay sesión, y se
 * reconecta después de cada refresh de sesión exitoso: una conexión viva no
 * vuelve a mandar cookies por su cuenta, así que sin este reconnect explícito
 * seguiría autenticada con el access_token viejo hasta que el servidor la
 * corte por expirado (dura 15 min, igual que el resto de la API).
 */
export function useSocket(): Socket | null {
  const usuarioId = useAuthStore((state) => state.usuario?.id ?? null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!usuarioId) return;

    const instance = io(API_URL, { withCredentials: true });
    setSocket(instance);

    const unsubscribe = onSessionRefreshed(() => {
      instance.disconnect();
      instance.connect();
    });

    return () => {
      unsubscribe();
      instance.disconnect();
      setSocket(null);
    };
  }, [usuarioId]);

  return socket;
}
