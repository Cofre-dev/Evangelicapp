# Brief para backend — Pendientes de "Finanzas de Departamentos"

El frontend de "Finanzas de Departamentos" ya está implementado contra el contrato que definió backend (ver entrada `2026-07-26 (continuación) — Finanzas de Departamentos` en `frontend/FEATURES.md`). Durante la implementación quedaron dos puntos abiertos que necesitan una acción o confirmación de backend antes de dar la feature por cerrada de punta a punta. Ninguno bloquea lo ya mergeado al frontend, pero sí bloquean poder cerrar el flujo de import como quedó descrito en el brief original y hacer QA end-to-end con confianza.

## 1. Falta el endpoint para descargar la plantilla de import — Prioridad: **alta** (bloquea completar el flujo de import tal como está descrito)

El brief original, sección 5 ("Import — flujo de UI"), paso 2, dice textualmente:

> Descarga la plantilla (ver sección 7 para el mockup) o sube directamente su archivo `.xlsx`/`.csv`.

Pero la sección 2 (contrato de API) nunca definió un endpoint para **descargar un archivo real** de plantilla — la sección 7 solo describe un mockup ilustrativo para diseño gráfico (imagen con callouts), no un archivo `.xlsx`/`.csv` real descargable. Sin este endpoint, el frontend no tiene de dónde traer el archivo que el botón "Descargar plantilla" debería entregar, y hoy ese botón no existe en el diálogo de import (`src/components/finanzas/importar-movimientos-dialog.tsx`) porque no hay nada contra qué apuntarlo.

**Qué necesitamos que resuelva backend:**

1. Confirmar si la intención original era que el frontend genere el archivo de plantilla client-side (sin llamar al backend) o que el backend lo sirva.
2. Si lo sirve el backend: exponer un endpoint tipo `GET /finanzas/movimientos/plantilla?formato=xlsx|csv` (o dos endpoints separados) que devuelva un archivo con:
   - Fila 1 = encabezados exactos ya definidos: `Fecha | Tipo | Categoría | Medio de pago | Monto | Descripción`.
   - Sin filas de datos de ejemplo (o, si se prefiere, las mismas 4 filas de ejemplo de la sección 7 del brief original — a definir por backend/producto, no es una decisión de frontend).
   - Mismos `Content-Type` que ya usa `exportar` (`.xlsx`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; `.csv`: `text/csv`).
3. Confirmar si este endpoint requiere sesión/CSRF igual que el resto de `finanzas/*`, o si puede ser público (no debería tener datos sensibles de la iglesia, solo la estructura).
4. Una vez confirmado el contrato, avisar a frontend para agregar el botón "Descargar plantilla" en `importar-movimientos-dialog.tsx` y consumirlo.

Si la decisión es que el frontend genere el archivo sin pegarle al backend (ej. un `.csv` estático embebido en el bundle), avisar igual — así frontend lo implementa sin esperar nada de backend, pero necesita la confirmación explícita para no adivinar.

## 2. Confirmar el comportamiento del dashboard en la pantalla "Finanzas general" — Prioridad: **media** (no bloquea, pero hay una inferencia sin confirmar que afecta qué tan confiable es el balance mostrado)

Frontend tuvo que inferir un comportamiento cruzando dos secciones del brief original que no se tocaban en un mismo lugar:

- Sección 1, punto 4: el dashboard de finanzas general **siempre suma todo** (general + todos los departamentos) en `totales`, sin importar nada más.
- Sección 4 (export): el botón "Exportar finanzas general" pega a `exportar` con `?general=true` — o sea, en la pantalla de "Finanzas general", el resto de las llamadas (movimientos, categorías, logs, export "actual") sí van filtradas con `general=true`, no sin filtro.

La implementación actual (`src/app/finanzas/page.tsx`) hace: dashboard **sin filtro** (para que sume todo y traiga `porDepartamento`) + movimientos/categorías/logs/export "actual" **con `general=true`**, en la misma pantalla. Es decir, dentro de una sola pantalla, dos llamadas al mismo `finanzas/movimientos` (`dashboard` vs. el resto) usan filtros distintos a propósito.

**Qué necesitamos que confirme backend:**

1. ¿Es correcta esa lectura, o el dashboard de "Finanzas general" debería llamarse también con `general=true` (y entonces el desglose `porDepartamento` nunca se vería ahí, contradiciendo la sección 1.4)?
2. Si la lectura del frontend es correcta, no hace falta ningún cambio de backend — alcanza con una confirmación explícita para cerrar la duda y poder marcarla como resuelta en `FEATURES.md`.
3. Si no es correcta, backend debe aclarar cuál es el filtro esperado para cada una de las 4 llamadas (`findAll`, `dashboard`, `exportar`, `logs`) específicamente cuando el usuario está parado en "Finanzas general" (no en un departamento puntual), porque hoy el brief no lo deja 100% inequívoco.

## 3. QA end-to-end conjunto — Prioridad: **media** (no es un fix, es coordinación)

Todo lo anterior se implementó y verifica limpio (`lint`/`typecheck`/`build`) contra el contrato escrito, pero **nunca se probó contra un backend real corriendo**. Antes de dar la feature por cerrada del todo, conviene una pasada conjunta frontend+backend cubriendo como mínimo:

1. Crear un departamento como PASTOR, confirmar que aparece en el dropdown y que un TESORERO no puede gestionarlo (solo operar movimientos dentro).
2. Crear/editar/eliminar movimientos tanto en "Finanzas general" como dentro de un departamento, confirmando que las categorías no se mezclan entre destinos.
3. Confirmar que el dashboard de "Finanzas general" trae `porDepartamento` y que el de un departamento puntual no (valida el punto 2 de este documento).
4. Archivar un departamento y confirmar que bloquea "Nuevo movimiento" pero no el historial ni el export.
5. Intentar eliminar un departamento con movimientos (debe dar 409 con el mensaje exacto) y uno sin movimientos (debe eliminar).
6. Probar el import con un archivo real: caso éxito con categorías nuevas creadas automáticamente, y caso con al menos una fila inválida para validar la tabla de errores (fila + mensaje).

## Respuesta de backend — 2026-07-26

### 1. Endpoint de plantilla — implementado

El backend sirve el archivo (no lo genera el frontend): así el archivo real que la gente descarga nunca puede desincronizarse de los headers que `FinanzasImportService` valida al importar. `HEADERS` (`['Fecha', 'Tipo', 'Categoría', 'Medio de pago', 'Monto', 'Descripción']`) ahora se exporta desde `finanzas-import.service.ts` y la reusa tanto `importar()` (validación) como el nuevo `plantilla()` (generación) — un solo lugar de verdad para el orden y texto de los encabezados.

**Contrato:**

```
GET /finanzas/movimientos/plantilla?formato=xlsx|csv
```

- Mismos guards que el resto de `finanzas/*`: `JwtAuthGuard` + `RolesGuard` + `@Roles(PASTOR, TESORERO)` (heredado de la clase `MovimientosController`). Requiere sesión y CSRF no aplica porque es un `GET`. No es público — no había ninguna razón real para bajar el perímetro de seguridad en este endpoint, y así se mantiene consistente con `exportar`, `findAll`, etc.
- `formato` es obligatorio y solo acepta `xlsx` o `csv` (`@IsIn(['xlsx', 'csv'])` en `PlantillaMovimientosDto`). Si falta o viene con otro valor, `400 Bad Request` con el mensaje estándar de `class-validator` (`"formato must be one of the following values: xlsx, csv"`).
- El archivo trae **solo la fila de encabezados, sin filas de ejemplo** — decisión deliberada: si un usuario olvida borrar filas de ejemplo con montos/fechas ficticias antes de subir el archivo real, esas filas se importarían como movimientos financieros reales (falla silenciosa). El mockup de la sección 7 del brief original (con 4 filas de ejemplo) es solo para la imagen ilustrativa de diseño, no para el archivo real descargable.
- `.xlsx`: mismo `Content-Type` que `exportar` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), `Content-Disposition: attachment; filename="plantilla-movimientos.xlsx"`. Header en negrita y mismos anchos de columna que usa `exportar()` para las columnas equivalentes (no incluye la columna "Departamento" de `exportar`, porque el destino de la importación —general o un departamento puntual— se indica aparte, en el campo `departamentoId` del multipart, no en una columna del archivo).
- `.csv`: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="plantilla-movimientos.csv"`. Se genera como texto plano (una línea de headers separados por coma), sin pasar por `exceljs`.

**Ejemplo de request/response:**

```
GET /finanzas/movimientos/plantilla?formato=csv
Cookie: access_token=...
```

```
200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="plantilla-movimientos.csv"

Fecha,Tipo,Categoría,Medio de pago,Monto,Descripción
```

```
GET /finanzas/movimientos/plantilla?formato=pdf
```

```
400 Bad Request
{ "message": ["formato must be one of the following values: xlsx, csv"], "error": "Bad Request", "statusCode": 400 }
```

Implementado en `backend/src/modules/finanzas/movimientos.controller.ts` (endpoint), `backend/src/modules/finanzas/finanzas-import.service.ts` (método `plantilla()` + `HEADERS` ahora exportado) y `backend/src/modules/finanzas/dto/plantilla-movimientos.dto.ts` (DTO nuevo). Probado manualmente contra la base local: ambos formatos descargan bien, `formato` inválido o ausente da `400`, y el `.xlsx` generado se verificó fila por fila con `exceljs` — coincide exacto con los headers que `FinanzasImportService` exige al importar.

Frontend puede agregar el botón "Descargar plantilla" en `importar-movimientos-dialog.tsx` apuntando a esta URL.

### 2. Contrato del dashboard en "Finanzas general" — confirmado, con una corrección

La lectura del frontend es correcta tal cual está implementada en `src/app/finanzas/page.tsx`: en la pantalla "Finanzas general", `dashboard` se llama **sin filtro** (para que `totales` sume todo y traiga `porDepartamento`), mientras que `findAll`/`categorias`/`logs`/`exportar` (el "actual" de esa pantalla) se llaman **con `general=true`**, porque esas listan específicamente el libro general, no una mezcla de todo. No se necesitó ningún cambio de código para esto.

Corrección a la sección 2.3 del brief original: la frase "`porDepartamento`... no aparece si se filtró por `departamentoId` o `general=true`" es imprecisa. Verificado en `movimientos.service.ts#agruparPorDepartamento` (que ignora explícitamente los movimientos con `departamento: null`):

- Con `general=true`: `porDepartamento` sí queda **vacío** (`[]`), porque todos los movimientos filtrados tienen `departamento: null` — esto sí es como decía el brief.
- Con un `departamentoId` puntual: `porDepartamento` **sí aparece**, pero como un array de **un solo elemento** (ese departamento), cuyos `ingresos`/`egresos`/`balance` son idénticos a `totales` — es el resultado natural de agrupar movimientos que ya son todos del mismo departamento, no un bug. Frontend puede recibirlo así en la pantalla de un departamento puntual y decidir ignorarlo ahí (sería redundante con `totales`), pero no debe asumir que el array viene vacío en ese caso.

### 3. QA end-to-end conjunto — pendiente, coordinación humana

Esto no se resuelve escribiendo código: falta una sesión conjunta frontend+backend contra un backend real corriendo, cubriendo los 6 puntos listados arriba. No se ha hecho todavía ni se simuló acá — queda como pendiente a coordinar en una sesión aparte.
