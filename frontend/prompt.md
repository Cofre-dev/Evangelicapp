# Brief: confirmaciones de asistencia + plan/facturación en Finanzas y Mi iglesia

Contexto: esta sesión implementó 3 pedidos del founder que eran principalmente de frontend. Tuve acceso directo al repo de frontend (carpeta `agenda/asistencia` como working directory adicional, pero desde ahí pude navegar y editar el resto del repo) y ya apliqué los 3 cambios ahí mismo. Este documento es el registro del contrato de API para que quede trazable — no es un pedido pendiente.

## 1. Nuevo endpoint: `GET /agenda/eventos/:id/asistencias`

Antes no existía forma de ver, para un evento ya convocado por correo, quién confirmó/rechazó/no respondió — el dato vivía en la tabla `asistencias_evento` pero no había ningún endpoint que lo listara agregado por evento (solo el flujo público de un integrante viendo/respondiendo su propia invitación vía `agenda/asistencias/:token`).

- **Guards:** los mismos que el resto de `EventosController` — `JwtAuthGuard`, `RolesGuard`, `ModuloAccessGuard`, `@Roles(MANAGER, USUARIO)`, `@Modulo(AGENDA)`. No lo até solo a `MANAGER` aunque el pedido original decía "el manager debe poder ver" — lo mantuve consistente con el resto del módulo (un USUARIO con el módulo Agenda delegado ya puede crear/editar el mismo evento, así que tiene sentido que también vea sus confirmaciones). Si el founder quiere restringirlo solo a MANAGER, es cambiar el decorator en `eventos.controller.ts`.
- **Validación:** reutiliza `EventosService#findOne` internamente, que ya filtra por `iglesiaId` del JWT — un manager no puede consultar asistencias de un evento de otra iglesia adivinando el id.

**Response** (`200`, array):

```json
[
  {
    "integranteId": "cl123...",
    "nombreCompleto": "Juana Pérez",
    "email": "juana@example.com",
    "estado": "CONFIRMADO",
    "respondidoAt": "2026-08-08T14:32:00.000Z"
  }
]
```

`estado` es `"PENDIENTE" | "CONFIRMADO" | "RECHAZADO"`. `respondidoAt` es `null` mientras esté `PENDIENTE`. Viene ordenado por `nombreCompleto` ascendente. Si el evento no fue convocado (`notificarIntegrantes: false` al crearlo) o no había Integrantes en la iglesia en ese momento, devuelve `[]`.

**Ya consumido en frontend:** `components/agenda/asistencias-dialog.tsx` (nuevo), enganchado a un botón "Ver asistencia" en `EventoDialog` que aparece junto al badge "Se avisó a la congregación por correo" (o sea, solo cuando `evento.notificarIntegrantes` es `true` y se está editando un evento existente). Agrupa los resultados en 3 secciones con contador: Confirmaron / Sin responder / Rechazaron.

## 2. `iglesia.plan` ya viaja en la sesión — el frontend simplemente no lo estaba usando

No fue necesario ningún cambio de backend acá: `SafeUsuario.iglesia.plan` existe desde el 2026-08-03 (ver `FEATURES.md`, entrada "Planes comerciales") y viaja en `/auth/login` y `/auth/me` para cualquier rol de la iglesia, no solo MANAGER. El frontend nunca lo había tipado ni usado.

Cambios aplicados en frontend:
- `stores/auth-store.ts`: `SessionUser.iglesia` ahora incluye `plan: "BASICO" | "MEDIO" | "PRO"`.
- `app/finanzas/page.tsx`: el botón "Exportar todo consolidado" ya no se renderiza si `usuario.iglesia?.plan` es `BASICO` o `MEDIO` (esos planes tienen `PLAN_LIMITS.maxDepartamentosFinancieros = 0` — no hay subdepartamentos, así que el consolidado sería idéntico al general).
- Dos call-sites que pisaban `usuario.iglesia` en el store después de guardar nombre/logo (`components/mi-iglesia/editar-iglesia-form.tsx`, `components/mi-iglesia/logo-iglesia-uploader.tsx`) hacían `updateUsuario({ iglesia: { nombre, logoUrl } })` sin `plan` — ahora spread del `iglesia` existente en la sesión primero, para no perder el plan al guardar esos formularios.

**Nota de degradación conocida:** una sesión que ya estaba guardada en `localStorage` antes de este cambio no tiene `plan` hasta el próximo login — mientras tanto el botón de exportar consolidado se ve igual que antes (falla "abierto", no oculta nada que debería verse). Se autocorrige en el siguiente login; no bump-eé la versión del persist de zustand para esto porque no es una migración de shape rompiente como la de `PASTOR→MANAGER`.

## 3. `GET /mi-iglesia/facturacion` — existía en el backend, nadie lo llamaba

Este endpoint (`solo MANAGER`) existe desde el 2026-08-03 y devuelve plan, semáforo de facturación (`facturacion.color`: `VERDE`/`AMARILLO`/`ROJO`, `diasParaFacturacion`, `enMora`, `diasEnMora`) y uso actual contra los topes del plan (`limites.usuarios`, `limites.departamentosFinancieros`). Nunca había un componente de frontend que lo consumiera.

Agregué una tarjeta "Plan" en `/mi-iglesia` (`components/mi-iglesia/plan-card.tsx`) — informativa, no interactiva (no hay pasarela de pago todavía, ver `docs/supabase.md`/`README.md`). Muestra:
- Badge con el plan (`Básico`/`Medio`/`Pro`).
- Semáforo de facturación en una línea (punto de color + "Próxima facturación en N días" o "Facturación vencida hace N días").
- Cupo de usuarios (`actuales / máximo`).
- El texto pedido por el founder — "Si quieres subir de plan, manda un correo a contacto@evangelic.app con el asunto 'Solicitud de upgrade de plan — Iglesia...'" — **solo si `plan !== "PRO"`**. El link es un `mailto:` con el asunto ya armado (`Solicitud de upgrade de plan — {nombre de la iglesia}`).

**Alcance deliberadamente acotado:** no construí el resto del módulo de Facturación que había quedado especificado en el brief del 2026-08-03 (pantalla de cuenta suspendida por mora, acciones de SuperAdmin para marcar pagos u ocultar una iglesia) — eso no fue parte de lo que pidió el founder en esta sesión. Si se quiere retomar, esa parte sigue pendiente y sin construir en el frontend.

## Archivos tocados

**Backend:**
- `src/modules/agenda/eventos.service.ts` (+`findAsistencias`)
- `src/modules/agenda/eventos.controller.ts` (+`GET :id/asistencias`)

**Frontend** (repo separado, mismo working tree):
- `src/stores/auth-store.ts`
- `src/app/finanzas/page.tsx`
- `src/app/mi-iglesia/page.tsx`
- `src/components/mi-iglesia/types.ts`
- `src/components/mi-iglesia/plan-card.tsx` (nuevo)
- `src/components/mi-iglesia/editar-iglesia-form.tsx`
- `src/components/mi-iglesia/logo-iglesia-uploader.tsx`
- `src/components/agenda/types.ts`
- `src/components/agenda/asistencias-dialog.tsx` (nuevo)
- `src/components/agenda/evento-dialog.tsx`

Verificado con `tsc --noEmit` y `eslint` en ambos repos (sin errores en los archivos tocados). No corrí el frontend en el navegador ni levanté la base de datos para probar el endpoint nuevo end-to-end — recomiendo un smoke test manual antes de dar esto por cerrado: crear un evento CULTO con "Avisar a la congregación por correo" activado, responder una invitación desde el link público, y confirmar que "Ver asistencia" en el dialog de edición del evento refleja el cambio.
