# Brief para frontend — Rename PASTOR→MANAGER, eliminación de TESORERO/SECRETARIA, nuevo módulo de Accesos

## Qué cambió en el backend (ya implementado y desplegado a la BD de dev)

1. **Rol `PASTOR` renombrado a `MANAGER`.** Es el mismo dueño de cuenta de siempre (gestiona su
   equipo, agenda, finanzas, notas, mi iglesia) — solo cambia el string.
2. **`TESORERO` y `SECRETARIA` desaparecen.** Se reemplazan por un único rol genérico
   **`USUARIO`**. Ya no existe un rol "de fábrica" con permisos fijos para el equipo — el acceso
   de cada `USUARIO` a cada módulo del sistema lo otorga el `MANAGER` de forma individual, desde
   una pantalla nueva (checkbox por módulo, ver más abajo).
3. `MIEMBRO` y `SUPER_ADMIN` no cambian.
4. El enum de rol en la API queda: `SUPER_ADMIN | MANAGER | USUARIO | MIEMBRO`.

## Nuevo concepto: módulos delegables

Existen 4 módulos que el `MANAGER` puede otorgar a un `USUARIO`, uno a la vez:
`AGENDA`, `FINANZAS`, `CEREMONIAS`, `INTEGRANTES`. Esta lista puede crecer a futuro sin que
cambie el contrato de la API (ver `GET /accesos/catalogo` abajo) — el frontend **no debe
hardcodear** esta lista, debe leerla del backend.

**Notas/Tareas, Mi Iglesia y Usuarios (gestión de equipo) NO son delegables** — siguen siendo
exclusivos del `MANAGER`, igual que hoy. La única excepción: cualquier `USUARIO` (sin permiso de
módulo) sigue pudiendo ver y marcar como hechas **sus propias** tareas asignadas — eso no
cambia, no requiere ningún checkbox.

## Endpoints nuevos/cambiados

Todos requieren sesión (cookie httpOnly de siempre). Los 3 primeros son **solo `MANAGER`**
(403 para cualquier otro rol):

- `GET /accesos/catalogo` → `[{ id: "AGENDA", label: "Agenda" }, { id: "FINANZAS", label: "Finanzas" }, ...]`
  Úsalo para generar dinámicamente las columnas de la pantalla de Accesos.
- `GET /accesos/usuarios` → lista de usuarios con rol `USUARIO` de la iglesia, cada uno con sus
  módulos actuales: `[{ id, nombre, apellido, username, fotoUrl, activo, modulos: ["FINANZAS"] }, ...]`
- `PUT /accesos/usuarios/:usuarioId` con body `{ "modulos": ["AGENDA", "FINANZAS"] }` → reemplaza
  por completo el set de módulos de ese usuario (marcar/desmarcar un checkbox y guardar debe
  mandar el array completo resultante, no un diff).
- `GET /auth/me` (el endpoint que ya usan hoy para cargar el usuario logueado) ahora incluye un
  campo nuevo **`modulos: string[]`** con los módulos que el usuario actual tiene otorgados
  (siempre `[]` para `MANAGER`/`SUPER_ADMIN`/`MIEMBRO`, porque su acceso no depende de esta
  lista). **Usa este campo para decidir qué mostrar en el menú.**
- `POST /usuarios` (alta de equipo) **ya no recibe `rol` en el body** — todo usuario creado por
  el `MANAGER` nace con rol `USUARIO` automáticamente. El formulario de alta de usuario debe
  **quitar el selector de rol** (Tesorero/Secretaria) que tiene hoy.

## Pantalla nueva: "Accesos" (solo visible para MANAGER)

Una tabla: una fila por usuario (de `GET /accesos/usuarios`), una columna por módulo (de
`GET /accesos/catalogo`), un checkbox por celda. Al tildar/destildar y guardar, se llama
`PUT /accesos/usuarios/:usuarioId` con el array completo de módulos marcados para esa fila.
Como las columnas salen de `/accesos/catalogo`, si el backend agrega un módulo nuevo en el
futuro, esta pantalla debe mostrar la columna nueva automáticamente, sin cambios de código.

Agregar esta pantalla al menú/sidebar solo para `rol === "MANAGER"`.

## Impacto en el código actual del frontend (ya revisado)

Encontramos estos puntos concretos que hoy dependen de roles fijos y van a necesitar volverse
dinámicos (basados en `modulos`, no en un `switch`/mapa por rol):

- **`src/stores/auth-store.ts`**: el tipo `Rol = "SUPER_ADMIN" | "PASTOR" | "TESORERO" | "SECRETARIA" | "MIEMBRO"`
  pasa a `"SUPER_ADMIN" | "MANAGER" | "USUARIO" | "MIEMBRO"`. El objeto de usuario persistido
  debe guardar también el nuevo campo `modulos: string[]` que devuelve `/auth/me`.
- **`src/components/layout/navbar.tsx`**: el mapa estático `NAV_LINKS: Record<Rol, NavItem[]>`
  ya no alcanza (antes cada rol tenía su lista fija de links). Reemplazarlo por: los links
  exclusivos de `MANAGER` se muestran si `rol === "MANAGER"`; los links de Agenda/Finanzas/
  Ceremonias/Integrantes se muestran si `modulos.includes("AGENDA")` (etc.) **o** si
  `rol === "MANAGER"` (el manager ve todo, siempre).
- **`src/app/page.tsx`**: mismo problema en `ACCESOS_POR_ROL`, `ROLES_CON_TAREAS`,
  `ROLES_CON_AGENDA` — misma solución (data-driven por `modulos` + chequeo de `MANAGER`).
- **`src/components/usuarios/types.ts`**: `RolEquipo = "TESORERO" | "SECRETARIA"` y su label en
  español (`ROL_EQUIPO_DIRECTORIO_LABEL`) se eliminan — ya no hay elección de rol al crear un
  usuario de equipo, solo existe `USUARIO`. El directorio (`/usuarios/equipo`, endpoint que no
  cambió) ahora solo necesita mostrar "Manager" o "Usuario" según corresponda, sin las etiquetas
  viejas.
- No hay `middleware.ts` de rutas — la protección se hace por página/componente leyendo
  `usuario.rol` desde el store. Los mismos componentes que hoy chequean `rol === "PASTOR"` etc.
  para ocultar/mostrar secciones deben chequear `modulos` en vez de rol para lo que antes era
  Tesorero/Secretaria.

## Detalle importante de timing (no es un bug, es a propósito)

El backend calcula los `modulos` del usuario **al emitir el access token** (login o refresh),
no en cada request — el mismo comportamiento que ya existe hoy para `rol` (un cambio de rol
tampoco se revalida en cada request). Esto significa: si el manager le otorga un módulo nuevo a
alguien que ya tiene sesión iniciada, el menú puede tardar hasta ~15 min (vida del access token)
en poder **usar** ese módulo en la API, aunque `GET /auth/me` (que sí es fresco) ya lo muestre
antes en el menú. Es el mismo trade-off que ya existe hoy para cambios de rol, no es nuevo.
Si esto genera una mala experiencia (usuario ve el link en el menú pero la API le da 403), avisen
y evaluamos forzar un refresh de token al guardar accesos — no se implementó porque no fue
pedido explícitamente y agregaría complejidad no solicitada.

## ⚠️ Pendiente de confirmar con backend (encontrado durante la implementación)

Al probar el flujo real de "crear usuario → iniciar sesión con ese usuario", `POST /auth/login`
devolvió un `usuario` **sin el campo `modulos`** (`undefined`, no `[]`). El brief solo menciona
explícitamente que `GET /auth/me` incluye `modulos` — la respuesta de `POST /auth/login` no está
mencionada, pero el frontend usa el `usuario` de login directamente (vía `setSession`) para
decidir qué mostrar en el navbar/home antes de que se dispare ningún `/auth/me`, así que también
necesita `modulos` ahí. Se agregó una normalización defensiva en el frontend (`setSession` en
`auth-store.ts` cae a `[]` si `modulos` no viene), así que esto no bloquea, pero **`POST /auth/login`
debería devolver `modulos: string[]` en `usuario` igual que `/auth/me`** para que un `USUARIO`
recién logueado vea sus módulos reales desde el primer render, no una lista vacía hasta el
próximo `/auth/me` (o hasta el próximo refresh de token, ~15 min después).

## Checklist para el equipo de frontend

- [x] Actualizar el tipo `Rol` (quitar PASTOR/TESORERO/SECRETARIA, agregar MANAGER/USUARIO).
- [x] Guardar `modulos: string[]` en el store de auth, tomado de `/auth/me` y del login.
- [x] Nueva pantalla de Accesos (solo MANAGER) consumiendo `/accesos/catalogo`, `/accesos/usuarios`, `PUT /accesos/usuarios/:id`.
- [x] Sidebar/menú y home (`page.tsx`) data-driven por `modulos` en vez de mapas fijos por rol.
- [x] Formulario de alta de usuario: quitar selector de rol.
- [x] Quitar `RolEquipo`/labels de Tesorero-Secretaria del directorio de equipo.
- [x] Revisar cualquier otro `if (rol === "TESORERO" ...)` o `"SECRETARIA"` suelto en el código (búsqueda de texto) que no hayamos listado acá.
