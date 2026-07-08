# Registro de cambios

Bitácora técnica de este repo (frontend). Cada sesión de trabajo relevante agrega una entrada nueva **arriba de todo**, con fecha en formato `YYYY-MM-DD`. El objetivo es que cualquier modelo o persona que retome el proyecto entienda qué se hizo y **por qué**, sin tener que reconstruirlo desde `git log`.

Formato de cada entrada: qué cambió, por qué, y qué queda pendiente o abierto (si aplica). No es un changelog de usuario final — es contexto de ingeniería.

---

## 2026-07-08 (continuación 4) — Rediseño visual del login

**Por qué**: pantalla en blanco con un formulario centrado, sin nada de identidad ni calidez — para una app pensada para pastores y equipos de iglesias en todo Chile, quedaba muy genérica.

**Qué cambió** (`src/app/login/page.tsx`, solo capa visual — cero cambios en `zod`/`apiFetch`/redirect/manejo de errores): pantalla partida en dos en desktop/tablet (`lg:flex-row`) — panel de marca a la izquierda con gradiente (paleta ya existente, `hsl(199...)` a un azul más profundo), ícono `Church` en insignia con vidrio esmerilado, frase de misión, y una lista de los tres módulos principales (Agenda/Finanzas/Notas) con los mismos íconos que ya se usan en "Accesos rápidos" del home — refuerza la identidad visual en vez de agregar una nueva. En mobile, el mismo panel se condensa a una franja superior (no se oculta) para que la pantalla nunca sea "solo blanco con un formulario", ni siquiera en el tamaño donde más se usa esta pantalla (celulares, entrando desde WhatsApp/link directo). Se agregó un texto de ayuda ("¿No tienes una cuenta? Pídele acceso al pastor...") acorde al flujo real de la app (las cuentas las crea el pastor/superadmin, no hay auto-registro).

Verificado con Playwright en desktop (1440px), tablet (1024px) y mobile (390px) — sin errores de consola — y con el flujo de login real de punta a punta (cookies, redirect) para confirmar que el restyling no rompió nada funcional.

---

## 2026-07-08 (continuación 3) — Plan del módulo Colaboradores + QR + convocatorias (WhatsApp/email)

El backend propuso (`docs/colaboradores-qr.md`, todavía **no implementado**) un módulo nuevo: el pastor genera un QR de su iglesia, la gente lo escanea y deja sus datos de contacto (nombre/email/teléfono) en una landing pública sin login; cuando se organiza un culto, alguien del equipo aprieta "Convocar" en el evento y les llega WhatsApp (API oficial de Meta Cloud API, no libs no oficiales) + email a todos los colaboradores activos.

Se respondió (ver histórico de `prompt.md` si se conservó, o pedir el mensaje al backend) señalando una asimetría entre "mismo criterio que agenda" (3 roles: PASTOR/TESORERO/SECRETARIA) y la propuesta real para colaboradores (2 roles: PASTOR/SECRETARIA) — se propuso mantener esa restricción para el CRUD de contactos pero dejar `POST /agenda/eventos/:id/convocar` con los 3 roles de agenda, ya que ahí no se administra la lista de contactos. Pendiente de confirmación del backend: nombre del campo honeypot, formato de `iglesiaLogoUrl`, y forma de la respuesta 429 por rate limit.

**Nada de esto está implementado todavía** — es la fase de planificación. Cuando el backend confirme los 3 puntos pendientes, la fase 1 (CRUD + QR + registro público) arranca reutilizando el patrón de `/predicacion/[token]` para las rutas públicas, y la librería `qrcode` (nueva dependencia, liviana) para generar el QR del lado del cliente.

---

## 2026-07-08 (continuación 2) — Widget de próximos eventos en el home

El home (`src/app/page.tsx`) dejaba mucho espacio vacío debajo de "Accesos rápidos" — más notorio para `TESORERO` (2 accesos) y `SECRETARIA` (1 acceso). Se agregó `src/components/agenda/proximos-eventos.tsx`, una sección que consulta `/agenda/eventos` (mismo endpoint que usa `/agenda`) y muestra los próximos 5 eventos de los siguientes 30 días, para los mismos roles que ya tienen acceso a esa sección (`PASTOR`, `TESORERO`, `SECRETARIA` — `ROLES_CON_AGENDA` en `page.tsx`).

A propósito **no se oculta cuando no hay eventos** (a diferencia de "Accesos rápidos", que si está vacío no se renderiza) — muestra un estado vacío invitando a agendar uno, porque el objetivo explícito era llenar espacio con algo útil, no repetir el mismo problema con una sección que desaparece.

`MIEMBRO` no se tocó: no tiene forma de crearse todavía en ningún lado de la app (ni seed, ni UI de creación), así que el "home vacío para un miembro común" no es un caso real hoy — si en el futuro se habilita ese rol, hay que revisar `ACCESOS_POR_ROL.MIEMBRO` (hoy `[]`) y si debería ver este mismo widget en modo solo lectura.

Verificado visualmente contra el backend real (capturas con Playwright): con la sección vacía y con dos eventos de prueba cargados (creados y luego eliminados de la base de dev tras la verificación).

---

## 2026-07-08 (continuación) — Auth migrada a cookies httpOnly: completa

El backend confirmó e implementó el contrato propuesto (ver [`docs/auth-cookies.md`](./docs/auth-cookies.md)). Se hicieron los cambios correspondientes del lado del frontend:

- **`src/stores/auth-store.ts`**: se eliminaron `accessToken`/`refreshToken` del store — ahora solo persiste `usuario`. `setSession` cambió de firma: recibe `SessionUser` directo en vez de un objeto `{ accessToken, refreshToken, usuario }`.
- **`src/lib/api.ts`**: reescrito. `apiFetch` ahora manda `credentials: "include"` en cada request (ya no arma `Authorization` a mano — no hay token en JS que armar). Agrega automáticamente el header `X-CSRF-Token` en requests mutantes leyendo la cookie `csrf_token` vía `document.cookie`. Maneja 401 con un intento de refresh (`POST /auth/refresh`, coordinado entre pestañas con `navigator.locks` para evitar el falso positivo de "robo" que documenta el backend cuando dos tabs refrescan a la vez) y, si falla, limpia la sesión y redirige a `/login`.
- **~19 call sites** (todas las páginas y diálogos que llamaban `apiFetch(..., { token: accessToken })`): se sacó el parámetro `token` (ya no existe en `apiFetch`) y los guards `if (!accessToken) return` pasaron a chequear `usuario` (mismo propósito: no disparar el fetch antes de que el store rehidrate desde `localStorage`; el guard ya no protege nada relacionado a un token porque las cookies las maneja el navegador solo).
- **`src/components/layout/navbar.tsx`**: logout ahora solo llama `POST /auth/logout` sin pasar token.
- **`src/app/finanzas/page.tsx`**: el `fetch` directo para exportar Excel (necesitaba manejo de blob, no pasa por `apiFetch`) cambió `Authorization: Bearer` por `credentials: "include"`.

**Verificado end-to-end, no solo compilado**: contra el backend real corriendo local (Docker MySQL + Nest en :3001) con curl (login → cookies correctas → GET protegido con cookie → POST mutante sin CSRF rechazado 403 → POST con CSRF correcto 201 → refresh rota las 3 cookies → logout las limpia) y con Playwright manejando un Chromium real contra el frontend en :3000 (login → modal de cambio de contraseña y onboarding obligatorios completados vía UI real, ambos PATCH con CSRF → crear y eliminar una nota vía UI, POST y DELETE con CSRF → logout real → cookies en 0 tras logout → navegar a una ruta protegida después de logout rebota a `/login`). Cero errores de consola en todo el flujo.

`npm run lint`, `npm run typecheck` y `npm run build` pasan limpios.

**Efecto secundario del test**: se completó el onboarding del usuario demo `jperez` (mustChangePassword y onboardingCompletado pasaron a reflejar "completado") porque el modal correspondiente es obligatorio y bloquea toda interacción — no se pudo probar el resto de la app sin pasar por ahí. La contraseña se dejó igual (`Temporal123`). Si se necesita el estado "onboarding pendiente" para demos, hay que resetear esos flags manualmente en la base de dev.

**Pendiente**: confirmarle al backend que el frontend ya no usa el header `Authorization: Bearer` en ningún lado, para que puedan retirar ese fallback de compatibilidad.

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
