# Brief para frontend — 2026-07-28

Dos endpoints nuevos, listos en el backend. `npx tsc --noEmit` + `npx nest build` verificados sin errores.

## 1. Directorio del equipo (tarjetas de presentación con foto)

**`GET /usuarios/equipo`**
Guards: `JwtAuthGuard` + `RolesGuard`. Accesible para `PASTOR`, `TESORERO`, `SECRETARIA` (cualquier rol de la iglesia con equipo, no solo el pastor — a diferencia de `GET /usuarios`, que sigue siendo exclusivo del pastor para la pantalla de gestión).

No requiere query params. `iglesiaId` sale del JWT como siempre.

Respuesta — `200`, array ordenado (pastor primero, luego tesorero, secretaria, miembro; alfabético dentro de cada rol), **solo usuarios activos**, **incluye al pastor**:

```json
[
  {
    "id": "clx...",
    "nombre": "Matías",
    "apellido": "Cofre",
    "fotoUrl": "/uploads/perfiles/uuid.webp",
    "rol": "PASTOR"
  },
  {
    "id": "clx...",
    "nombre": "Juan",
    "apellido": "Pérez",
    "fotoUrl": null,
    "rol": "TESORERO"
  }
]
```

Notas de implementación para la tarjeta:
- `fotoUrl` puede venir `null` (el usuario nunca subió foto vía `PATCH /auth/me/foto`) — mostrar un avatar placeholder/iniciales en ese caso, igual que ya deben estar haciendo en el resto de la app donde se usa `Usuario.fotoUrl`.
- **No hay ranking ni métrica de participación** — se descartó a propósito, quedó definido como solo tarjeta de presentación (foto + nombre + cargo/rol). No hay que pedir ni mostrar ningún número de "actividad".
- El campo `rol` es el enum crudo (`PASTOR`/`TESORERO`/`SECRETARIA`/`MIEMBRO`) — la traducción a español para mostrar en la tarjeta (ej. "Tesorero") queda del lado del frontend, como ya se hace en otras pantallas.
- `GET /usuarios` (la lista de gestión del pastor, sin el pastor mismo) ahora también trae `fotoUrl` en cada fila, por si sirve para mostrar el avatar en esa tabla de administración.

## 2. Descargar logs de auditoría de finanzas (.xlsx)

**`GET /finanzas/movimientos/logs/exportar`**
Guards: mismos del controller — `PASTOR`/`TESORERO`.

Mismo contrato de filtro que ya usa `GET /finanzas/movimientos/logs` (el que hoy alimenta la vista JSON de logs) y que `GET /finanzas/movimientos/exportar`:

| Query param | Efecto |
|---|---|
| _(ninguno)_ | Consolidado: logs de toda la iglesia, todos los departamentos + finanzas general |
| `departamentoId=<id>` | Solo los logs de ese departamento |
| `general=true` | Solo los logs de finanzas general (movimientos sin departamento) |

Respuesta: `200`, binario `.xlsx` (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="logs-auditoria.xlsx"`). Igual patrón que ya manejan para `GET /finanzas/movimientos/exportar` — descarga directa, sin pasar por JSON intermedio.

Columnas del archivo: Fecha, Acción (Creación/Edición/Eliminación), Usuario, Departamento, Tipo (Ingreso/Egreso), Categoría, Monto, Descripción, más una fila de resumen al final con el total de registros y si es consolidado o filtrado.

Sugerencia de UI: un botón "Descargar logs" junto al selector de departamento que ya deben tener en la pantalla de logs — reusando el mismo `departamentoId`/`general` que esté seleccionado en ese momento, y otro botón (o el mismo sin filtro) para "Descargar todo consolidado". Mismo patrón de trigger que ya usan para el botón de exportar movimientos (`<a href>` o `fetch` + blob, según cómo lo hayan resuelto ahí).

---

# Brief para frontend — 2026-07-28 (actualización: módulo Equipo)

Ambos fixes ya se implementaron directamente en el repo del frontend (`c:\Users\rojas\Documents\GitHub\Evangelicapp\frontend`), no requieren nada nuevo de backend. Se documenta acá el porqué, no como pendiente.

## 1. "Desactivar" no elimina al usuario

Se confirmó explícitamente: `PATCH /usuarios/:id { activo: false }` **nunca borra nada**. Es el mismo patrón que ya usa `DepartamentoFinanciero.activo` y `Nota.archivado` en este proyecto — el registro sigue existiendo, solo:
- Le bloquea el login (`AuthService#validateUser` rechaza si `!usuario.activo`).
- Lo oculta de `GET /usuarios/equipo` (el directorio con tarjetas, que filtra `activo: true`).

Sus movimientos financieros creados, logs de auditoría, notas, eventos, etc. quedan intactos y con su autoría trazable. El pastor puede reactivarlo en cualquier momento con el mismo botón (`activo: true`). **No se agregó confirmación con contraseña** a esta acción — decisión explícita del fundador, porque no es destructiva ni irreversible (a diferencia de eliminar un movimiento financiero, que sí la exige). Tampoco se implementó un borrado real (hard delete) de `Usuario`: rompería la trazabilidad de auditoría financiera (los logs quedarían sin poder decir quién hizo qué), y el caso de uso real — que la persona deje de tener acceso — ya lo cubre desactivar.

## 2. Bug encontrado y corregido: un usuario desactivado desaparecía sin forma de reactivarlo

**Causa:** `src/app/equipo/page.tsx` armaba la grilla de tarjetas a partir de `GET /usuarios/equipo`, que por diseño solo devuelve usuarios **activos** (es el directorio tipo tarjeta de presentación, pensado para todo el equipo, no para gestión). Resultado: en cuanto el pastor desactivaba a alguien, esa persona desaparecía de la vista por completo — sin tarjeta, no había dónde hacer clic en "Activar" para revertirlo.

**Fix:** para el pastor, la fuente de las tarjetas ahora es distinta de la de tesorero/secretaria:
- **Pastor**: su propia tarjeta sale de `/usuarios/equipo` (el directorio lo incluye); el resto del equipo sale completo de `GET /usuarios` (`gestion`), que **no filtra por `activo`** — así que ve activos e inactivos. Las tarjetas de usuarios inactivos se muestran atenuadas (`opacity-60`) con el badge "Inactivo", y el botón "Activar" siempre disponible.
- **Tesorero/Secretaria**: sin cambios — siguen viendo solo `/usuarios/equipo` (activos), que es lo correcto para ellos: no tienen por qué ver ni gestionar gente desactivada.

Archivos tocados: `src/app/equipo/page.tsx` (lógica de `tarjetas`), `src/components/usuarios/types.ts` (se agregó `fotoUrl` a `UsuarioEquipo`, necesario porque ahora una tarjeta de pastor puede construirse desde ese tipo en vez de `UsuarioEquipoDirectorio`). Verificado con `next build` completo, sin errores.

---

## Pendiente de definición (no implementado todavía)

Pasarela de pago (suscripción SaaS) y módulo de donaciones por iglesia (incluyendo donantes no autenticados): está en fase de diseño/plan, conversándose con el fundador antes de tocar código o schema. Ver `docs/plan-pagos-y-donaciones.md` para el detalle completo.
