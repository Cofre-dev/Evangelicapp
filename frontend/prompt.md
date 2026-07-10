# Backend → Frontend: fix urgente de CSRF en el deploy (bloquea todo POST/PUT/PATCH/DELETE)

Contexto: el backend está deployado en Render (`https://evangelicapp-backend.onrender.com`) y el frontend en Vercel (`https://evangelicapp.vercel.app`) — dominios distintos. El login ya funciona y la sesión persiste, pero **cualquier acción que modifique datos (crear iglesia, etc.) devuelve 403 "Token CSRF inválido o ausente"**. Ya identificamos la causa y la arreglamos del lado del backend; falta el cambio correspondiente acá.

## Por qué pasa

El backend protege contra CSRF con un patrón de "doble cookie": junto a las cookies de sesión (httpOnly), pone una cookie `csrf_token` que **no** es httpOnly a propósito, para que el frontend la lea con JS y la reenvíe en un header `X-CSRF-Token` en cada request que modifica datos. El backend compara cookie vs. header y si no coinciden, rechaza con 403.

Ese diseño asume que frontend y backend están en el mismo dominio. Como no es el caso acá (Vercel vs. Render), **el JS del frontend no puede leer la cookie `csrf_token`** — un navegador no permite leer con `document.cookie` una cookie que pertenece a otro dominio, sin importar que no sea httpOnly. Por eso el frontend nunca tiene el valor que debería mandar en el header, y todo request mutante falla.

## Qué cambió en el backend (ya deployado)

Como el frontend no puede leer la cookie, ahora el backend **también devuelve el `csrfToken` en el body JSON** de estos dos endpoints:

- `POST /auth/login` → el body de la respuesta ahora incluye `csrfToken` (junto a `usuario`, `requiresPasswordChange`, `requiresOnboarding`, que ya estaban).
- `POST /auth/refresh` → el body pasó de ser `{ ok: true }` a `{ ok: true, csrfToken }`.

(`accessToken` y `refreshToken` siguen sin viajar nunca en el body — esos van solo en cookies httpOnly, eso no cambió.)

## Qué tienen que hacer ustedes, paso a paso

1. **Capturar el `csrfToken` del body de la respuesta de login.** En donde sea que manejen la respuesta de `POST /auth/login` (probablemente un servicio/store de auth), guarden `csrfToken` en memoria — un store de estado (Zustand, Redux, Context, lo que estén usando), **no en localStorage ni en una cookie propia**. No hace falta persistirlo entre recargas de página: si el usuario recarga, van a tener que pegarle a `/auth/refresh` de todos modos (para renovar el access token), y esa respuesta también trae un `csrfToken` fresco.

2. **Mandar el header en cada request mutante.** En el cliente HTTP que usen (fetch wrapper, instancia de axios, etc.), agreguen el header `X-CSRF-Token` con el valor guardado en el store, **solo para `POST`, `PUT`, `PATCH`, `DELETE`** (los `GET` no lo necesitan y no deben mandarlo). Si tienen un interceptor/wrapper central para las requests, ese es el lugar — mejor que agregarlo a mano en cada llamada.

3. **Actualizar el `csrfToken` guardado cada vez que se llama a `/auth/refresh`.** El token rota en cada refresh (el backend genera uno nuevo y también rota las cookies). Si tienen lógica de refresh automático (ej. un interceptor que ante un 401 llama a `/auth/refresh` y reintenta la request original), asegúrense de:
   - Actualizar el `csrfToken` en el store con el que viene en la respuesta del refresh, **antes** de reintentar la request original.
   - Que la request reintentada use el `csrfToken` nuevo, no el viejo.

4. **Confirmar que todas las requests al backend van con `credentials: 'include'`** (fetch) o `withCredentials: true` (axios). Esto ya tiene que estar andando (si no, el login tampoco persistiría la sesión), pero conviene confirmarlo explícitamente ya que estamos tocando esta parte — sin esto, ni las cookies de sesión ni la de csrf viajan.

5. **Si en algún lado del código ya había un intento de leer `csrf_token` desde `document.cookie`**, bórrenlo — no va a funcionar nunca en este deploy cross-site y es la causa raíz de este bug. La única fuente confiable ahora es el body de `/auth/login` y `/auth/refresh`.

## Cómo probar que quedó bien

1. Login con el usuario SuperAdmin de prueba.
2. Crear una iglesia nueva desde el panel — antes daba 403, ahora debería funcionar.
3. Dejar la sesión abierta el tiempo suficiente para que dispare un refresh automático (o forzarlo si tienen alguna forma de testearlo), y confirmar que después de ese refresh las acciones mutantes siguen funcionando (esto valida que el `csrfToken` se está actualizando correctamente tras el refresh, no solo en el login inicial).

Cualquier duda sobre el contrato exacto de los endpoints, el middleware que valida esto está en `backend/src/common/middleware/csrf.middleware.ts` del repo del backend, y el controller que arma las respuestas en `backend/src/modules/auth/auth.controller.ts`.
