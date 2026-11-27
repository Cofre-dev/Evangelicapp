"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Script from "next/script";

/**
 * Widget de Cloudflare Turnstile cargado con su script oficial (no una
 * dependencia npm — regla del proyecto: dependencias nuevas se confirman con
 * el autor). Render explícito para poder resetearlo tras un error del backend.
 *
 * Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no está definida no se renderiza nada:
 * el backend local tampoco exige el token.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      language?: string;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileHandle {
  reset: () => void;
}

interface TurnstileProps {
  onToken: (token: string | null) => void;
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile({ onToken }, ref) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [scriptListo, setScriptListo] = useState(() => typeof window !== "undefined" && Boolean(window.turnstile));

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  const renderizar = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !window.turnstile || !contenedorRef.current || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(contenedorRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      language: "es",
      theme: "light",
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });
  }, []);

  useEffect(() => {
    if (scriptListo) renderizar();
    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [scriptListo, renderizar]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    },
  }));

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptListo(true)}
        onReady={() => setScriptListo(true)}
      />
      <div ref={contenedorRef} className="flex min-h-[65px] justify-center" />
    </>
  );
});
