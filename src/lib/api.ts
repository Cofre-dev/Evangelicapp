import { useAuthStore } from "@/stores/auth-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type ApiFetchOptions = RequestInit;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REFRESH_PATH = "/auth/refresh";

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function rawFetch(path: string, options: ApiFetchOptions): Promise<Response> {
  const { headers, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();

  // FormData (subida de archivos): dejar que el navegador ponga su propio
  // Content-Type con el boundary — si lo fijamos nosotros, el backend no
  // puede parsear el multipart.
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
  const csrfToken = readCsrfToken();

  return fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(MUTATING_METHODS.has(method) && csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...headers,
    },
  });
}

// Coordina el refresh entre pestañas: sin esto, dos tabs refrescando casi al
// mismo tiempo hacen que el backend interprete el segundo intento como reuso
// de un refresh token ya rotado (su señal de robo) y cierre la sesión en todas.
async function refreshSession(): Promise<boolean> {
  const run = async () => (await rawFetch(REFRESH_PATH, { method: "POST" })).ok;

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return navigator.locks.request("evangelicapp-refresh", run);
  }
  return run();
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && path !== REFRESH_PATH) {
    const refreshed = await refreshSession();
    res = refreshed ? await rawFetch(path, options) : res;
  }

  if (res.status === 401) {
    useAuthStore.getState().clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new ApiError(res.status, message ?? "Ocurrió un error inesperado");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
