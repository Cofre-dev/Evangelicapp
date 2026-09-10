# Puesta en producción — checklist

Guía para llevar **este repo (frontend)** a producción en `app.evangelicapp.cl`.
Complementa a `README.md` (setup) y `FEATURES.md` (bitácora). Marcá cada `[ ]` a
medida que lo completás.

> Última revisión del checklist: 2026-09-09.

---

## 0. Mapa de piezas (qué se despliega dónde)

| Pieza | Repo | Hosting | Dominio |
|---|---|---|---|
| Landing / sitio de marketing | (otro) | (ya andando) | `evangelicapp.cl` + `www.evangelicapp.cl` |
| **App (este repo, frontend)** | este | **Vercel** | **`app.evangelicapp.cl`** |
| Backend (NestJS + Prisma) | separado | **Render** | **`api.evangelicapp.cl`** |
| Base de datos + Realtime + Storage | — | **Supabase** (proyecto "Backend", plan Pro) | `lkcgiqmgdefhxhckedga.supabase.co` |

**Supabase Pro y Render Pro no son de este repo**: Render Pro hostea el backend,
Supabase Pro es la BD/Realtime/Storage que consumen los dos. Este repo solo
necesita la URL del backend y las dos variables públicas de Supabase.

### Por qué `app.` + `api.` bajo el mismo dominio raíz

Las cookies de sesión (`docs/auth-cookies.md`) son `httpOnly`, `Secure` en prod,
**`SameSite=Lax`** y host-only (sin `Domain`). Con `app.evangelicapp.cl` y
`api.evangelicapp.cl` bajo el mismo dominio registrable (`evangelicapp.cl`), las
requests de `apiFetch` son **same-site** → el navegador manda las cookies en cada
`fetch` sin que el backend cambie nada.

Si el frontend quedara en `*.vercel.app` y el backend en `*.onrender.com` (dominios
distintos = *cross-site*), `SameSite=Lax` **no** manda las cookies en los `fetch`
→ el login "entra" pero ninguna request autenticada después funciona. Por eso el
custom domain de la app **no es opcional** para producción.

El `csrf_token` sigue viajando en el body de `/auth/login` y `/auth/refresh` (no
por cookie legible) porque el JS de `app.evangelicapp.cl` igual no puede leer una
cookie host-only de `api.evangelicapp.cl` — eso no cambia con los subdominios.
Ver `src/lib/api.ts` (`csrfToken` en memoria).

---

## 1. Repo — cambios de código (esta sesión)

- [x] `frontend/docs/deploy-produccion.md` — este documento.
- [x] Correo de soporte: `contacto@evangelic.app` → `contacto@evangelicapp.cl`
      en `cuenta-suspendida`, `facturacion`, `finanzas/departamentos`,
      `politica-privacidad`.
- [x] `.env.example` — `NEXT_PUBLIC_API_URL` vuelve a `http://localhost:3001` por
      defecto (valor de dev); prod documentado como comentario.
- [x] `README.md` — sección "Deploy" apuntando acá.
- [x] `docs/auth-cookies.md` — nota de topología de producción.
- [x] `npm run lint && npm run typecheck && npm run build` en limpio (2026-09-09).
- [ ] Commit en `staging` (no mergear a `main` todavía — ver §7).

> **No se toca** `src/lib/api.ts` ni `src/stores/auth-store.ts` (CLAUDE.md: no
> modificar auth sin confirmar contrato con backend). El esquema actual ya
> soporta la topología `app.` + `api.` sin cambios.

---

## 2. Supabase (proyecto "Backend", plan Pro)

- [ ] Confirmar que el plan **Pro** está activo en el proyecto correcto
      (`lkcgiqmgdefhxhckedga` — el ref que está hardcodeado en `next.config.ts`
      para `images.remotePatterns` y en `.env.example`).
      **Si producción usa un proyecto Supabase nuevo/distinto**, hay que cambiar
      además el hostname hardcodeado en `frontend/next.config.ts` (línea del
      `remotePatterns` de `*.supabase.co`), no solo la variable de entorno.
- [ ] Copiar la **anon / publishable key**: Dashboard → proyecto "Backend" →
      Project Settings → API → `anon` `public`. Va a Vercel (§4), no se commitea.
- [ ] Storage: el bucket público de logos/fotos sigue **público**
      (`/storage/v1/object/public/**`) — `next.config.ts` lo espera así.
- [ ] Realtime habilitado + **RLS sobre `realtime.messages` aplicada** (migración
      del backend). Sin esto, `GET /realtime/token` responde 503 y la app corre
      en modo "sin realtime" (no rompe, pero no hay tiempo real). — *coordinación
      con repo backend.*

---

## 3. Backend en Render (coordinación con el repo del backend)

El frontend de `staging` ya asume cambios de backend que **todavía no están en
producción** (migración de Realtime a Supabase Broadcast, bloqueo de login,
estado de convocatoria, recuperación de contraseña). Antes del cutover (§7):

- [ ] Deploy a Render **prod** de los cambios de backend equivalentes a lo que
      consume `staging`.
- [ ] Migraciones aplicadas a la **Supabase de producción** (incluidas
      `add_login_lockout`, `realtime_convocatoria_topic`, RLS de
      `realtime.messages`).
- [ ] Variables de entorno en Render (prod):
  - [ ] `CORS_ORIGIN` incluye `https://app.evangelicapp.cl`
        (separado por coma, **sin wildcard** — `credentials: true` no admite `*`).
  - [ ] `SUPABASE_JWT_SECRET` seteado (para `GET /realtime/token`).
  - [ ] `MAIL_PROVIDER=resend`, `RESEND_API_KEY=re_...`,
        `MAIL_FROM="EvangelicApp <no-reply@evangelicapp.cl>"`.
- [ ] Custom domain **`api.evangelicapp.cl`** agregado al servicio de Render, con
      cert HTTPS emitido.
- [ ] Confirmar con backend que las cookies de sesión salen `SameSite=Lax` (no
      `Strict`) y `Secure` en prod.
- [ ] DNS de Resend (SPF/DKIM) sobre `evangelicapp.cl` para que los correos
      transaccionales no caigan a spam.

---

## 4. Vercel — proyecto del frontend

- [ ] Proyecto de Vercel conectado al repo de GitHub.
- [ ] **Settings → General → Root Directory = `frontend`** (el código no está en
      la raíz del repo).
- [ ] Framework Preset: **Next.js** (autodetecta). Build / Install / Output: por
      defecto.
- [ ] **Settings → General → Node.js Version = `20.x`** (matchea `.nvmrc` y
      `engines.node` de `package.json`; CI también corre en 20).
- [ ] **Settings → Git → Production Branch = `main`**.
- [ ] **Settings → Environment Variables** (scope **Production**):

  | Variable | Valor |
  |---|---|
  | `NEXT_PUBLIC_API_URL` | `https://api.evangelicapp.cl` |
  | `NEXT_PUBLIC_SUPABASE_URL` | `https://lkcgiqmgdefhxhckedga.supabase.co` |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon key del §2)* |

  - [ ] **NO** setear `NEXT_IMAGES_UNOPTIMIZED` (es solo para Cloudflare/staging).
  - [ ] `NEXT_PUBLIC_URL_POLITICA_PRIVACIDAD` — opcional; la página
        `/politica-privacidad` ya existe y el fallback relativo alcanza.
  - Recordá: las `NEXT_PUBLIC_*` se **hornean en build**. Cambiar cualquiera
    exige **redeploy**, no basta con guardar.

- [ ] **Settings → Domains → agregar `app.evangelicapp.cl`**. Vercel muestra el
      registro DNS exacto a crear (§5). Hasta el merge de §7, este dominio sirve
      la versión vieja de `main` — es esperable.
- [ ] Plan: Vercel **Hobby es no comercial** por ToS. Esto es un SaaS comercial
      → plan **Pro** (~USD 20/mes/miembro). Alternativa para evitar ese costo:
      Cloudflare Workers (ya cableado, ver §9) — decisión aparte.

---

## 5. DNS (en tu proveedor de zona — nic.cl o donde esté delegada)

No tocar `evangelicapp.cl` ni `www` (landing ya andando). Agregar:

- [ ] `app.evangelicapp.cl` → **CNAME** al target que muestra Vercel
      (normalmente `cname.vercel-dns.com`).
- [ ] `api.evangelicapp.cl` → **CNAME** al target que muestra Render
      (`<servicio>.onrender.com`).
- [ ] Esperar propagación y verificar que **ambos** emitieron certificado HTTPS
      (Vercel y Render lo hacen solos vía Let's Encrypt una vez que el DNS
      resuelve).
- [ ] `curl -sI https://app.evangelicapp.cl` y `https://api.evangelicapp.cl`
      → 200/redirect esperado, no error de cert.

---

## 6. QA en staging (antes del cutover)

Correr sobre `staging` (Cloudflare Workers o `npm run dev` contra el backend
real). Flujos que `FEATURES.md` marca como **no probados e2e**:

- [ ] Login OK + redirect a dashboard; cookies `Secure`/`SameSite=Lax` seteadas.
- [ ] Refresh coordinado entre 2 pestañas (Web Locks) — ninguna se desloguea.
- [ ] 3 logins fallidos → mensaje de cuenta bloqueada (`CUENTA_BLOQUEADA`).
- [ ] Recuperación de contraseña de punta a punta (pedir link → correo llega →
      resetear → login).
- [ ] Finanzas: cargar movimientos (GET autenticado) + crear/editar uno
      (mutación con CSRF).
- [ ] Convocatoria en vivo: abrir el diálogo y `/agenda/convocatoria/<token>`
      desde un mail real, responder desde otro dispositivo, ver el parcheo en
      vivo.
- [ ] Censo QR en vivo: registrar desde otro dispositivo con el panel abierto.
- [ ] Renovación del token de realtime (>29 min con una pantalla "en vivo"
      abierta — el canal no se corta).
- [ ] Rutas públicas sin sesión: `/predicacion/[token]`,
      `/agenda/asistencia/[token]`, `/integrantes/registro/[qrToken]`.

---

## 7. Cutover

**Orden estricto** (el merge dispara el deploy de producción en Vercel):

1. [ ] §2, §3, §4, §5 completos y verificados.
2. [ ] §6 (QA en staging) sin bloqueantes.
3. [ ] Avisar / ventana de deploy acordada.
4. [ ] Merge `staging` → `main`:
   ```bash
   git checkout main
   git pull origin main
   git merge --no-ff staging
   git push origin main
   ```
   > `main` está ~1 mes y 18 commits detrás de `staging` al momento de escribir
   > esto. Revisar el diff del merge antes de pushear.
5. [ ] Vercel despliega `main` a producción automáticamente. Seguir el build en
      el dashboard.
6. [ ] §8 (smoke test) inmediatamente después.

---

## 8. Smoke test en producción (post-deploy)

- [ ] `evangelicapp.cl` (landing) sigue intacta.
- [ ] `app.evangelicapp.cl` carga: login, logo e `Inter`/`Playfair` OK.
- [ ] Bundle del login apunta al backend correcto (no `localhost`):
      `curl -s https://app.evangelicapp.cl/login | grep -o 'api.evangelicapp.cl'`
      o revisá Network en el navegador.
- [ ] Login real → dashboard.
- [ ] Navegar a Finanzas y cargar datos (GET autenticado funciona → cookies
      viajan).
- [ ] Crear/editar un registro (mutación → header `X-CSRF-Token` del body OK).
- [ ] 2 pestañas + refresh de sesión → ambas siguen logueadas.
- [ ] Una pantalla "en vivo" (censo QR o convocatoria) parchea desde otro
      dispositivo — o degrada limpio a "sin realtime".
- [ ] Logos de iglesia cargan (`next/image` optimizado vía Vercel).
- [ ] `/cuenta-suspendida` y `/facturacion` muestran `contacto@evangelicapp.cl`.
- [ ] Un correo transaccional real llega (reset de contraseña).

---

## 9. Rollback

- **Frontend**: Vercel → Deployments → promover el deployment anterior a
  Production (instantáneo). O `git revert -m 1 <sha-del-merge>` + push.
- **Backend**: rollback del deploy en Render por separado. Ojo con migraciones
  ya aplicadas a la BD prod — coordinar con backend antes de revertir.
- Las `NEXT_PUBLIC_*` viejas quedan en el deployment viejo, así que promover un
  deployment anterior en Vercel es consistente sin tocar variables.

---

## 10. Alternativa a Vercel (nota de costos)

El repo ya tiene cableado **Cloudflare Workers** vía `@opennextjs/cloudflare`
(`wrangler.jsonc`, scripts `cf:*`) — hoy usado solo como **staging**. Se podría
usar como producción para ahorrar el costo de Vercel Pro, **pero**:

- Requiere `NEXT_IMAGES_UNOPTIMIZED=true` → `next/image` sirve `<img>` plano, sin
  optimización on-the-fly.
- La variable `NEXT_PUBLIC_API_URL` va en **Settings → Builds → Variables**
  (no en Settings general — bug ya documentado en `FEATURES.md` 2026-08-25).
- El deploy de staging a Cloudflare todavía tiene el login sin verificar e2e.

El repo eligió Vercel para prod a propósito (comportamiento más fiel al runtime
real de Next.js, optimización de imágenes sin config). Cambiar eso es una
decisión aparte, no parte de este checklist.
