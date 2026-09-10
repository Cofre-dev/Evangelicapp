# Puesta en producción — checklist

Guía para llevar **este repo (frontend)** a producción en `app.evangelicapp.cl`,
hospedado en **Cloudflare Workers**. Complementa a `README.md` (setup) y
`FEATURES.md` (bitácora). Marcá cada `[ ]` a medida que lo completás.

> Última revisión: 2026-09-09. Decisión: hosting en **Cloudflare Workers** (no
> Vercel) — ya está cableado como staging, sale gratis a esta escala y consolida
> todo en una cuenta. Ver §10 para la alternativa Vercel.

---

## 0. Mapa de piezas (qué se despliega dónde)

| Pieza | Repo | Hosting | Dominio |
|---|---|---|---|
| Landing / sitio de marketing | (otro) | (ya andando) | `evangelicapp.cl` + `www.evangelicapp.cl` |
| **App (este repo, frontend)** | este | **Cloudflare Workers** (`@opennextjs/cloudflare`) | **`app.evangelicapp.cl`** |
| Backend (NestJS + Prisma) | separado | **Render** | **`api.evangelicapp.cl`** |
| Base de datos + Realtime + Storage | — | **Supabase** (plan Pro) | ver §3 |

**Supabase Pro y Render Pro no son de este repo**: Render Pro hostea el backend,
Supabase Pro es la BD/Realtime/Storage que consumen los dos. Este repo solo
necesita 3 variables `NEXT_PUBLIC_*`.

### Por qué `app.` + `api.` bajo el mismo dominio raíz

Las cookies de sesión (`docs/auth-cookies.md`) son `httpOnly`, `Secure` en prod,
**`SameSite=Lax`** y host-only (sin `Domain`). Con `app.evangelicapp.cl` y
`api.evangelicapp.cl` bajo `evangelicapp.cl`, las requests de `apiFetch` son
**same-site** → el navegador manda las cookies en cada `fetch` sin que el backend
cambie nada. Si el frontend quedara en `*.workers.dev` y el backend en
`*.onrender.com` (cross-site), `SameSite=Lax` **no** manda las cookies en los
`fetch` → el login "entra" pero nada autenticado funciona después. Por eso el
custom domain **no es opcional**.

---

## Estado actual (inspeccionado 2026-09-09 vía MCP de Cloudflare)

- Worker **`evangelicapp`** (`evangelicapp.rojascofrem.workers.dev`), conectado
  al repo vía **Workers Builds**, rama de producción = **`staging`**.
  Build: `npm run cf:build` · Deploy: `npx wrangler deploy` · Node 20.20.2.
- **Las 3 variables `NEXT_PUBLIC_*` YA están seteadas** en el panel de Builds
  (el bug de 2026-08-25 está resuelto). Valores actuales = **staging**:
  - `NEXT_PUBLIC_API_URL` = `https://evangelicapp-backend.onrender.com`
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://woerftoeqarupnrggupl.supabase.co` (proyecto **Backend-staging**)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_...` (de ese proyecto)
- **Sin custom domain / routes** — solo el `*.workers.dev`.
- Builds pasan limpios; deploy OK.

> ⚠️ Hay **dos proyectos Supabase**: `woerftoeqarupnrggupl` (Backend-staging, lo
> que usa el Worker hoy) y `lkcgiqmgdefhxhckedga` (el que está en `.env.example`
> y era el fallback hardcodeado de `next.config.ts` — presumiblemente el de
> producción). **Confirmá cuál es producción** antes de setear variables (§3).

---

## 1. Repo — cambios de código (esta sesión)

- [x] `frontend/docs/deploy-produccion.md` — este documento (reescrito para Cloudflare).
- [x] Correo de soporte `contacto@evangelic.app` → `contacto@evangelicapp.cl` (4 archivos).
- [x] `.env.example` — `NEXT_PUBLIC_API_URL` vuelve a `http://localhost:3001` por defecto.
- [x] `README.md` — sección "Deploy".
- [x] `docs/auth-cookies.md` — nota de topología de producción.
- [x] `next.config.ts` — el hostname de Supabase Storage se deriva de
      `NEXT_PUBLIC_SUPABASE_URL` (antes hardcodeado a `lkcgiqmgdefhxhckedga`;
      rompía la carga de imágenes en staging, que usa otro proyecto).
- [x] `npm run lint && typecheck && build` en limpio.

> **No se toca** `src/lib/api.ts` ni `src/stores/auth-store.ts` (CLAUDE.md).

---

## 2. DNS — `evangelicapp.cl` a Cloudflare

- [ ] En el dashboard de Cloudflare: **Add a site** → `evangelicapp.cl` → plan Free.
- [ ] Cloudflare escanea los registros actuales. **Revisá que haya importado
      TODO lo de la landing y el correo** antes de seguir:
  - [ ] registros de la landing (apex `evangelicapp.cl`, `www`)
  - [ ] `MX` y cualquier `TXT` de correo (SPF/DKIM/DMARC) si tenés buzones
  - Lo que falte, agregalo a mano ahora — si cambiás los nameservers sin esto,
    se cae la web y el mail.
- [ ] En **nic.cl** → cambiar los nameservers del dominio a los 2 que da
      Cloudflare (`x.ns.cloudflare.com`).
- [ ] Esperar a que Cloudflare marque la zona como **Active** (minutos a horas).
- [ ] Registros nuevos (se agregan en §4 y §5, no ahora):
  - `api.evangelicapp.cl` → CNAME al target de Render (**DNS only**, nube gris)
  - `app.evangelicapp.cl` → lo crea Cloudflare solo al agregar el custom domain
    al Worker (§5)

---

## 3. Supabase (plan Pro)

- [ ] **Confirmar cuál proyecto es producción**: `lkcgiqmgdefhxhckedga` o uno
      nuevo. (Backend-staging = `woerftoeqarupnrggupl`, no tocar como prod.)
- [ ] Plan **Pro** activo en el proyecto de producción.
- [ ] Copiar de ese proyecto → Project Settings → API:
  - `Project URL` → para `NEXT_PUBLIC_SUPABASE_URL`
  - `anon` / `publishable` key → para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      (no es secreta, pero no se commitea)
- [ ] Storage: bucket de logos/fotos **público** (`/storage/v1/object/public/**`).
- [ ] Realtime habilitado + **RLS sobre `realtime.messages`** aplicada al
      proyecto de prod (migración del backend). Sin esto la app corre en modo
      "sin realtime" (no rompe). — *coordinación con repo backend.*
- [ ] `next.config.ts` ya no hardcodea el hostname — pero si el proyecto de prod
      NO es `lkcgiqmgdefhxhckedga`, revisá que el fallback de ese archivo (para
      builds locales sin la variable) no confunda a nadie.

---

## 4. Backend en Render (coordinación con el repo del backend)

El frontend de `staging` ya asume cambios de backend que **todavía no están en
producción** (Realtime a Supabase Broadcast, bloqueo de login, convocatoria,
recuperación de contraseña). Antes del cutover (§7):

- [ ] Deploy a Render **prod** de los cambios equivalentes a lo que consume `staging`.
- [ ] Migraciones aplicadas a la **Supabase de producción** (`add_login_lockout`,
      `realtime_convocatoria_topic`, RLS de `realtime.messages`).
- [ ] Variables de entorno en Render (prod):
  - [ ] `CORS_ORIGIN` incluye `https://app.evangelicapp.cl` (coma-separado, **sin
        wildcard** — `credentials: true` no admite `*`).
  - [ ] `SUPABASE_JWT_SECRET` del **mismo proyecto Supabase** que usa el frontend
        de prod (si no coinciden, `GET /realtime/token` emite un JWT que Supabase
        rechaza y no hay realtime).
  - [ ] `MAIL_PROVIDER=resend`, `RESEND_API_KEY=re_...`,
        `MAIL_FROM="EvangelicApp <no-reply@evangelicapp.cl>"`.
- [ ] Custom domain **`api.evangelicapp.cl`** en Render → copiar el target CNAME
      que da Render → crearlo en Cloudflare DNS como **DNS only** (nube gris).
- [ ] Verificar cert HTTPS emitido en `api.evangelicapp.cl`.
- [ ] Confirmar con backend que las cookies salen `SameSite=Lax` y `Secure` en prod.
- [ ] DNS de Resend (SPF/DKIM/DMARC) — agregar en Cloudflare DNS.

---

## 5. Cloudflare Workers — configurar producción

**Decisión previa**: ¿un Worker o dos?

- **Opción A (1 Worker, simple)**: `evangelicapp` pasa a ser producción. Se le
  cambian las variables a valores de prod y se le agrega el custom domain. Se
  pierde el entorno de staging aislado (la QA futura va por `npm run cf:preview`
  local o un preview deployment).
- **Opción B (2 Workers, recomendada)**: se crea un Worker nuevo
  `evangelicapp-prod` conectado al repo por Workers Builds; `evangelicapp` sigue
  siendo staging. Cada uno con sus propias variables y su rama.
  - Transición: mientras `main` esté desactualizado, conectá `evangelicapp-prod`
    también a la rama `staging` (mismo código, distinta config). Cuando hagas el
    merge a `main`, cambiá la rama de producción de ese Worker a `main`.

Pasos (para el Worker que vaya a ser producción):

- [ ] **Variables** — Worker → Settings → **Build** → Variables and Secrets
      (⚠️ el panel de *Build*, no el de runtime), scope **Production**:

  | Variable | Valor |
  |---|---|
  | `NEXT_PUBLIC_API_URL` | `https://api.evangelicapp.cl` |
  | `NEXT_PUBLIC_SUPABASE_URL` | *(Project URL de prod, §3)* |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon key de prod, §3)* |

  - [ ] **NO** setear `NEXT_IMAGES_UNOPTIMIZED` acá salvo que quieras `<img>`
        plano. En Workers, `next/image` on-the-fly **no** funciona sin un loader
        (ver comentario en `next.config.ts`). **Recomendado: sí setearla a
        `true`** — los logos ya son HTTPS públicos y chicos, no vale la pena
        contratar Cloudflare Images. Decidilo antes del primer deploy de prod.
  - Recordá: las `NEXT_PUBLIC_*` se hornean en build → cambiar una exige
    **redeploy** (Deployments → Retry, o push nuevo).

- [ ] **Custom domain**: Worker → Settings → Domains & Routes → **Add** →
      Custom Domain → `app.evangelicapp.cl`. Cloudflare crea el registro DNS y el
      cert solo (la zona ya está en la cuenta desde §2).
- [ ] `wrangler.jsonc`: el `name` del Worker tiene que coincidir con el Worker
      real (hoy `evangelicapp`). Si vas por Opción B, el Worker de staging
      necesita su propio `name` — ver nota de `wrangler.jsonc`.
- [ ] Workers Builds → confirmar rama de producción, build command
      `npm run cf:build`, deploy `npx wrangler deploy`, root directory `frontend`.
- [ ] Disparar un deploy y verificar (§8).

---

## 6. QA en staging (antes del cutover)

Sobre `evangelicapp.rojascofrem.workers.dev` (el Worker de staging), **no**
`npm run dev` — hay que probar el runtime real de Workers:

- [ ] Login OK + redirect a dashboard; cookies `Secure`/`SameSite=Lax` seteadas.
- [ ] Refresh coordinado entre 2 pestañas (Web Locks) — ninguna se desloguea.
- [ ] 3 logins fallidos → mensaje de cuenta bloqueada (`CUENTA_BLOQUEADA`).
- [ ] Recuperación de contraseña de punta a punta (link → correo → reset → login).
- [ ] Finanzas: cargar movimientos (GET autenticado) + crear/editar uno (CSRF).
- [ ] Convocatoria en vivo: diálogo + `/agenda/convocatoria/<token>` desde un
      mail real, responder desde otro dispositivo, ver el parcheo en vivo.
- [ ] Censo QR en vivo desde otro dispositivo.
- [ ] Renovación del token de realtime (>29 min con una pantalla "en vivo" abierta).
- [ ] Logos de iglesia cargan (con `NEXT_IMAGES_UNOPTIMIZED` en el valor que
      hayas elegido).
- [ ] Rutas públicas sin sesión: `/predicacion/[token]`,
      `/agenda/asistencia/[token]`, `/integrantes/registro/[qrToken]`.

---

## 7. Cutover

1. [ ] §2, §3, §4, §5 completos y verificados.
2. [ ] §6 (QA) sin bloqueantes.
3. [ ] Ventana de deploy acordada.
4. [ ] **Opción A**: cambiar las variables del Worker `evangelicapp` a valores de
      prod + agregar custom domain → Retry deploy.
      **Opción B**: el Worker `evangelicapp-prod` ya está construyendo; agregarle
      el custom domain.
5. [ ] (Cuando quieras alinear `main`) Merge `staging` → `main`:
   ```bash
   git checkout main && git pull origin main
   git merge --no-ff staging
   git push origin main
   ```
   `main` está ~1 mes / 18 commits detrás de `staging`. Revisá el diff.
6. [ ] §8 (smoke test) inmediatamente después.

---

## 8. Smoke test en producción

- [ ] `evangelicapp.cl` (landing) + correo siguen intactos.
- [ ] `app.evangelicapp.cl` carga: login, logo, fuentes.
- [ ] El bundle apunta al backend correcto:
      `curl -s https://app.evangelicapp.cl/login` y revisar los chunks JS, o
      Network en el navegador → `api.evangelicapp.cl`, no `onrender.com` ni `localhost`.
- [ ] Login real → dashboard.
- [ ] Finanzas: cargar datos (GET autenticado → cookies viajan).
- [ ] Crear/editar un registro (mutación → `X-CSRF-Token` del body OK).
- [ ] 2 pestañas + refresh → ambas siguen logueadas.
- [ ] Una pantalla "en vivo" parchea desde otro dispositivo, o degrada limpio.
- [ ] Logos de iglesia cargan.
- [ ] `/cuenta-suspendida` y `/facturacion` muestran `contacto@evangelicapp.cl`.
- [ ] Un correo transaccional real llega (reset de contraseña).

---

## 9. Rollback

- **Frontend**: Cloudflare → Worker → **Deployments** → seleccionar la versión
  anterior → **Rollback** (instantáneo). O `git revert` + push.
- **Backend**: rollback del deploy en Render por separado. Ojo con migraciones ya
  aplicadas a la BD prod — coordinar con backend.
- Las `NEXT_PUBLIC_*` viejas están horneadas en el bundle viejo, así que el
  rollback de la versión del Worker es consistente sin tocar variables.

---

## 10. Alternativa: Vercel

Si preferís no lidiar con la config de Workers y pagar para que sea un no-tema:
Vercel (plan **Pro**, ~USD 20/mes/miembro — Hobby es no comercial). Proyecto con
root directory `frontend/`, Node 20.x, production branch, las 3 `NEXT_PUBLIC_*`,
custom domain `app.evangelicapp.cl`. `next/image` funciona sin config y sin
`NEXT_IMAGES_UNOPTIMIZED`. El resto del checklist (DNS, Supabase, backend, CORS,
smoke test) es igual.
