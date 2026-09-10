# Puesta en producción — checklist

Frontend (este repo) en **Cloudflare Workers**, dominio `app.evangelicapp.cl`.
Complementa `README.md` y `FEATURES.md`.

> Última revisión: 2026-09-10.

---

## Estado real (verificado 2026-09-10)

Está más avanzado de lo que parecía:

- ✅ **DNS**: `evangelicapp.cl` ya está delegado a Cloudflare (nameservers
  `ignacio/zoe.ns.cloudflare.com` puestos en nic.cl). Zona activa. Landing +
  `www` andando por Cloudflare. **Nada que hacer acá.**
- ✅ **Worker `evangelicapp`** (`evangelicapp.rojascofrem.workers.dev`): Workers
  Builds conectado al repo, construye `staging` en cada push, builds verdes.
- ✅ **Variables del Worker ya en valores de producción** (panel de Build):
  - `NEXT_PUBLIC_API_URL` = `https://evangelicapp-backend.onrender.com`
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://woerftoeqarupnrggupl.supabase.co` (**evangelicapp-prod**)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_...` (de ese proyecto)
- ✅ **Backend (Render) responde** y su CORS ya permite
  `https://evangelicapp.rojascofrem.workers.dev` con `credentials: true`.
- ❌ **Falta**: dominio `app.evangelicapp.cl` en el Worker · CORS del backend para
  ese dominio · (opcional) `api.evangelicapp.cl` · QA de login sobre el Worker.

En la práctica, el Worker de "staging" **ya corre el stack de producción
completo** (backend prod + Supabase prod), solo que en una URL fea y sin haber
confirmado que el login funciona ahí.

---

## Lo que falta — 3 pasos

### Paso 1 — Dominio `app.evangelicapp.cl` en el Worker (Cloudflare, ~5 min)

1. Cloudflare → **Compute (Workers)** → Worker **`evangelicapp`**.
2. **Settings** → **Domains & Routes** → **Add** → **Custom Domain**.
3. Escribir `app.evangelicapp.cl` → **Add domain**.
4. Cloudflare crea el registro DNS y el certificado solo. En 1–2 min responde.
5. Verificar: `https://app.evangelicapp.cl` carga la app.

### Paso 2 — CORS del backend para el dominio nuevo (repo del backend / Render)

- Render → servicio del backend → **Environment** → variable **`CORS_ORIGIN`**.
- Agregar `https://app.evangelicapp.cl` a la lista (coma-separada, sin espacios,
  **sin wildcard** — `credentials: true` no admite `*`).
- Guardar → Render redespliega solo.
- Verificar:
  ```bash
  curl -s -i -X OPTIONS https://evangelicapp-backend.onrender.com/auth/login \
    -H "Origin: https://app.evangelicapp.cl" \
    -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
  ```
  Tiene que devolver `access-control-allow-origin: https://app.evangelicapp.cl`.

### Paso 3 — QA de login sobre `app.evangelicapp.cl`

Entrar con un usuario real y confirmar:

- [ ] Login → entra al panel (las cookies de sesión se setean y viajan).
- [ ] Navegar a Finanzas y que cargue (GET autenticado funciona).
- [ ] Crear/editar un registro (mutación con CSRF).
- [ ] Abrir 2 pestañas, dejar la sesión un rato, navegar → ninguna se desloguea.
- [ ] Una pantalla "en vivo" (censo QR / convocatoria) actualiza desde otro
      dispositivo, o degrada limpio a "sin realtime".
- [ ] Logos de iglesia cargan.
- [ ] Rutas públicas sin sesión: `/predicacion/[token]`, `/agenda/asistencia/[token]`,
      `/integrantes/registro/[qrToken]`.
- [ ] `/cuenta-suspendida` y `/facturacion` muestran `contacto@evangelicapp.cl`.
- [ ] Un correo real llega (reset de contraseña — requiere Resend en Render).

**Si el login NO funciona** (entra pero después todo da error de sesión): es el
tema de las cookies cross-site. `app.evangelicapp.cl` (Cloudflare) y
`evangelicapp-backend.onrender.com` (Render) son dominios distintos; si el backend
setea las cookies con `SameSite=Lax`, no viajan en los `fetch`. Solución: hacer el
**Paso 4** (mover el backend a `api.evangelicapp.cl`, mismo dominio raíz) **o** que
el backend cambie las cookies a `SameSite=None; Secure`.

---

## Paso 4 (opcional, o obligatorio si el Paso 3 falla) — `api.evangelicapp.cl`

Poner el backend bajo el mismo dominio raíz que la app: así las cookies
`SameSite=Lax` viajan sin que el backend cambie nada (mismo `evangelicapp.cl` =
same-site). Detalle del porqué en `docs/auth-cookies.md`.

1. Render → servicio del backend → **Settings** → **Custom Domains** → agregar
   `api.evangelicapp.cl`. Render da un target (`<algo>.onrender.com`).
2. Cloudflare → DNS de `evangelicapp.cl` → **Add record**:
   - Tipo `CNAME`, nombre `api`, target el de Render, **Proxy status: DNS only**
     (nube gris — no proxear la API).
3. Esperar el certificado en Render.
4. Cloudflare → Worker `evangelicapp` → Settings → Build → Variables →
   `NEXT_PUBLIC_API_URL` = `https://api.evangelicapp.cl` → **Retry deployment**.
5. Render → `CORS_ORIGIN` → asegurarse de que `https://app.evangelicapp.cl` está
   (el de `onrender.com` ya se puede sacar).
6. Repetir el QA del Paso 3.

---

## Antes de considerar "producción de verdad"

El código productivo vive en `staging` (rama), no en `main` — `main` está ~1 mes
atrás. El Worker construye `staging`, así que hoy sirve el código bueno. Cuando
quieras alinear:

```bash
git checkout main && git pull origin main
git merge --no-ff staging && git push origin main
```

Y, del lado del backend (repo aparte): confirmar que Render prod tiene desplegado
lo que el frontend de `staging` asume (Realtime a Supabase Broadcast, bloqueo de
login, convocatoria, recuperación de contraseña) y que las migraciones están
aplicadas a `evangelicapp-prod`. Varias entradas de `FEATURES.md` marcan "backend
en staging, prod todavía no".

---

## Separar staging de producción (más adelante, no urgente)

Hoy no hay entorno de staging real: el Worker `evangelicapp` es a la vez QA y
(pronto) producción. Si querés un colchón:

- **Opción A**: crear un Worker `evangelicapp-staging` nuevo, conectarlo al repo
  por Workers Builds en una rama de QA, con su propio proyecto Supabase si hace
  falta. `evangelicapp` queda de producción con `app.evangelicapp.cl`.
- **Opción B**: usar preview deployments de Workers Builds (ramas no-producción
  generan URLs `<hash>-evangelicapp...workers.dev` automáticamente).

---

## Rollback

- **Frontend**: Cloudflare → Worker → **Deployments** → versión anterior →
  **Rollback** (instantáneo). O `git revert` + push.
- **Backend**: rollback del deploy en Render aparte. Ojo con migraciones ya
  aplicadas a la BD prod.

---

## Alternativa: Vercel

Si algún día preferís pagar (~USD 20/mes, plan Pro — Hobby es no comercial) para
no lidiar con Workers: proyecto con root `frontend/`, Node 20.x, las 3
`NEXT_PUBLIC_*`, custom domain `app.evangelicapp.cl`. `next/image` funciona sin
config. El resto del checklist (DNS ya está, Supabase, backend, CORS, QA) es igual.
