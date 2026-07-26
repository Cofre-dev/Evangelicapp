# Brief para Frontend — Módulo Ceremonias

Backend ya implementado y probado de punta a punta (creación, folio correlativo, descarga y
verificación visual de los 4 certificados PDF, control de roles). Este documento es el contrato
completo para conectar la UI. Ver `FEATURES.md` (entrada `2026-07-25 20:10`) para el detalle de
la implementación.

## 1. Objetivo

Reemplaza el libro físico donde la iglesia lleva el registro de matrimonios, bautizos, defunciones
y presentaciones (dedicación de niños). Cada submódulo es un CRUD simple + un botón para emitir el
certificado en PDF de esa ceremonia, con el logo y nombre de la iglesia ya insertados.

## 2. Navegación

En el menú principal, **"Ceremonias"** es un ítem con submenú desplegable (no navega a una página
propia al hacer click en el ítem padre — despliega las 4 opciones):

```
Ceremonias ▾
  ├─ Matrimonios      → /ceremonias/matrimonios
  ├─ Bautizos         → /ceremonias/bautizos
  ├─ Defunciones      → /ceremonias/defunciones
  └─ Presentaciones   → /ceremonias/presentaciones
```

Cada opción lleva a su propio listado independiente (no hay una vista combinada de "todas las
ceremonias" en el backend — si se quiere una, es una composición en el frontend a partir de los 4
listados).

## 3. Permisos

Todas las rutas de `/ceremonias/*` requieren sesión y quedan restringidas a **PASTOR** y
**SECRETARIA**. Cualquier otro rol (TESORERO, SUPER_ADMIN, MIEMBRO) recibe `403 Forbidden` — el
ítem del menú no debería mostrarse a esos roles.

## 4. Convenciones generales de la API

- Todas las rutas van tras el mismo esquema de auth que el resto de la app: cookies
  `access_token`/`refresh_token` (HttpOnly) + header `x-csrf-token` en cada request mutante
  (`POST`/`PATCH`/`DELETE`), igual que `finanzas` o `integrantes`.
- `iglesiaId` nunca se envía desde el cliente — el backend lo toma siempre de la sesión.
- Los 4 submódulos son estructuralmente idénticos, solo cambian los campos del formulario. Todas
  las rutas siguen el patrón `/ceremonias/<submodulo>`.
- `folio` es un correlativo que asigna el backend al crear el registro (1, 2, 3... por iglesia y
  por tipo de ceremonia) — nunca se pide al usuario, se muestra en el detalle/certificado.

Para cada submódulo:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/ceremonias/<submodulo>` | Lista (soporta `?from=YYYY-MM-DD&to=YYYY-MM-DD` sobre el campo `fecha`) |
| `GET` | `/ceremonias/<submodulo>/:id` | Detalle — es la pantalla "resumen" |
| `POST` | `/ceremonias/<submodulo>` | Crea el registro (body = DTO de creación) |
| `PATCH` | `/ceremonias/<submodulo>/:id` | Edita (todos los campos del DTO de creación, opcionales) |
| `DELETE` | `/ceremonias/<submodulo>/:id` | Elimina — body `{ "password": string }` (confirmación de contraseña del usuario logueado, mismo patrón que borrar un movimiento financiero) → `204 No Content` |
| `GET` | `/ceremonias/<submodulo>/:id/certificado` | Descarga el certificado en PDF |

### Descarga del certificado (frontend)

El endpoint de certificado responde `Content-Type: application/pdf` y
`Content-Disposition: attachment; filename="certificado_<tipo>_<folio>.pdf"`. Para el botón
**"Emitir certificado"**:

```js
const res = await fetch(`${API_URL}/ceremonias/matrimonios/${id}/certificado`, {
  credentials: 'include',
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `certificado_matrimonio_${folio}.pdf`; // o leer el filename del header Content-Disposition
a.click();
URL.revokeObjectURL(url);
```

No requiere CSRF (es un `GET`).

## 5. Submódulo: Matrimonios

`/ceremonias/matrimonios`

Campos del formulario (DTO de creación `CreateMatrimonioDto` / edición igual con todos opcionales):

| Campo | Tipo | Validación |
|---|---|---|
| `fecha` | string (`YYYY-MM-DD`) | requerido, fecha ISO |
| `nombreNovio` | string | requerido, máx. 150 |
| `nombreNovia` | string | requerido, máx. 150 |
| `nombrePastor` | string | requerido, máx. 150 — sugerir prellenar con el pastor de la sesión, editable |
| `ciudad` | string | requerido, máx. 100 — sugerir prellenar con la comuna de la iglesia, editable |

Respuesta (`GET`/`POST`/`PATCH`) incluye además: `id`, `folio`, `iglesiaId`, `creadoPorId`,
`createdAt`, `updatedAt`.

## 6. Submódulo: Bautizos

`/ceremonias/bautizos`

| Campo | Tipo | Validación |
|---|---|---|
| `fecha` | string (`YYYY-MM-DD`) | requerido |
| `nombrePersona` | string | requerido, máx. 150 |
| `nombrePastor` | string | requerido, máx. 150 |
| `ciudad` | string | requerido, máx. 100 |

## 7. Submódulo: Defunciones

`/ceremonias/defunciones`

| Campo | Tipo | Validación |
|---|---|---|
| `fecha` | string (`YYYY-MM-DD`) | requerido — fecha de la defunción/ceremonia |
| `nombreDifunto` | string | requerido, máx. 150 |
| `nombrePastor` | string | requerido, máx. 150 |
| `ciudad` | string | requerido, máx. 100 |

## 8. Submódulo: Presentaciones

`/ceremonias/presentaciones`

| Campo | Tipo | Validación |
|---|---|---|
| `fecha` | string (`YYYY-MM-DD`) | requerido |
| `nombreNino` | string | requerido, máx. 150 |
| `nombrePadres` | string | requerido, máx. 200 — texto libre (ej. "Andrea Sepúlveda y Cristián Sepúlveda") |
| `nombrePastor` | string | requerido, máx. 150 |
| `ciudad` | string | requerido, máx. 100 |

## 9. Flujo de pantallas

1. **Listado** (`/ceremonias/<submodulo>`): tabla con fecha, nombre(s) principal(es) y folio;
   botón "Nuevo registro" y acceso al detalle de cada fila.
2. **Formulario de creación**: los campos de la tabla de arriba para ese submódulo.
3. **Detalle / resumen** (`/ceremonias/<submodulo>/:id`): muestra todos los datos del registro
   (incluyendo folio) y dos acciones: **"Emitir certificado"** (dispara la descarga del PDF) y
   editar/eliminar.
4. **Eliminar**: modal pidiendo la contraseña del usuario antes de confirmar (mismo patrón que
   eliminar un movimiento financiero).

## 10. Pendiente / a definir con el fundador

- No existe un endpoint de "resumen combinado" de las 4 ceremonias — si el home del módulo
  Ceremonias necesita mostrar algo antes de elegir un submódulo (ej. contadores), es una decisión
  de producto que no se implementó todavía; se puede agregar un endpoint liviano si se confirma
  que hace falta.
- El campo `nombrePastor` es texto libre en los 4 formularios (no está atado a un `Usuario` del
  sistema) porque quien oficia una ceremonia no siempre tiene cuenta en la plataforma. El
  frontend puede sugerir el nombre del pastor de la sesión como valor por defecto, editable.
~