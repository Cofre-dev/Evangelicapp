# Registro de cambios

Bitácora técnica de este repo (frontend). Cada sesión de trabajo relevante agrega una entrada nueva **arriba de todo**, con fecha en formato `YYYY-MM-DD`. El objetivo es que cualquier modelo o persona que retome el proyecto entienda qué se hizo y **por qué**, sin tener que reconstruirlo desde `git log`.

Formato de cada entrada: qué cambió, por qué, y qué queda pendiente o abierto (si aplica). No es un changelog de usuario final — es contexto de ingeniería.

---

## 2026-07-08

### Reestructuración: frontend pasa a ser la raíz del repo

Hasta ahora el código vivía anidado en `frontend/`, remanente de cuando este repo también tenía un backend NestJS adentro (ya removido en el commit `886b134`). Se movió todo el contenido de `frontend/` a la raíz (`git mv`, historial preservado) para que este repo sea un repo de frontend estándar — sin necesidad de configurar "root directory" en Vercel/CI.

De paso se encontró y corrigió que `frontend/.next/` (build cache, incluyendo binarios) estaba trackeado en git — 324 de 377 archivos del repo. Se sacó del tracking junto con `tsconfig.tsbuildinfo` y `next-env.d.ts` (autogenerados por Next.js), y se actualizó `.gitignore` en consecuencia. **No se reescribió el historial pasado** (decisión explícita del equipo) — el `.git` local sigue pesado por los commits viejos que sí incluían esos binarios.

Se eliminó también la carpeta `backend/` que quedaba físicamente en disco (solo tenía `node_modules` sin trackear, cruft de la separación anterior).

### Higiene de proyecto

- **`npm run lint` estaba roto**: no existía archivo de config de ESLint, así que `next lint` quedaba esperando input interactivo (habría roto cualquier CI). Se agregó `.eslintrc.json` (`extends: next/core-web-vitals`).
- Se agregó `.env.example` documentando `NEXT_PUBLIC_API_URL`.
- Se agregó `.nvmrc` (Node 20) y `engines` en `package.json` para fijar la versión de Node del proyecto.
- Se agregó `npm run typecheck` (`tsc --noEmit`).
- Se agregó CI (`.github/workflows/ci.yml`): corre `lint` + `typecheck` + `build` en cada PR/push a `main`. No hay step de tests porque todavía no hay suite de tests en el repo.
- `next.config.ts`: el dominio permitido para `next/image` (`images.remotePatterns`) estaba hardcodeado a `localhost:3001`. Ahora se deriva de `NEXT_PUBLIC_API_URL`, así que al pasar a producción alcanza con cambiar la variable de entorno — no hay que tocar código.

### Seguridad: kickoff de migración de auth a cookies httpOnly

**Problema**: hoy `POST /auth/login` devuelve `accessToken`/`refreshToken` en el body, y el frontend los guarda en Zustand persistido en `localStorage` (`src/stores/auth-store.ts`). Cualquier XSS en el frontend permitiría robar esos tokens. Dado que la app maneja datos personales y financieros de iglesias a nivel nacional, se decidió cerrar ese riesgo.

**Estado**: se redactó y envió (fuera de este repo, a la sesión de Claude del lado del backend) una propuesta de contrato para migrar a cookies `httpOnly` + `Secure` + `SameSite=Lax`, con endpoint de refresh (`/auth/refresh`) y logout (`/auth/logout`) que limpian cookies, más CSRF vía double-submit cookie para requests mutantes. **Todavía no se implementó nada del lado del frontend** — se está esperando confirmación del backend sobre: nombres/atributos exactos de las cookies, mecanismo de CSRF, estrategia de rotación de refresh token, y orígenes de CORS.

**Pendiente cuando el backend confirme el contrato**:
- Sacar `accessToken`/`refreshToken` de `auth-store.ts` (el store solo debería guardar `usuario`).
- `src/lib/api.ts`: agregar `credentials: "include"` a `apiFetch` y quitar el armado manual del header `Authorization` (hoy se repite en ~19 archivos que llaman a `apiFetch` pasando `token`).
- Agregar el header CSRF en requests mutantes según el mecanismo acordado.
- Interceptor de 401: intentar `POST /auth/refresh` una vez y reintentar; si falla, limpiar sesión y redirigir a `/login`.
- Cambiar el flujo de logout para llamar a `POST /auth/logout`.

No tocar `auth-store.ts` ni `api.ts` para esto sin haber confirmado el contrato con el backend primero — evita tener que rehacer el trabajo si el mecanismo de CSRF o los nombres de cookies cambian.
