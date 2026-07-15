# Frontend → Backend: endpoint de "actividad reciente" para un dashboard más vivo

## Contexto

Un agente `ux-ui-expert` hizo una auditoría visual completa de la app y una ronda de ideas para que el home (`/`, tras loguearse) se sienta más "vivo" — no una app de formularios estáticos, sino algo que refleja que la comunidad está activa (nuevos movimientos financieros, eventos agendados, tareas completadas). La mayoría de esas ideas se resuelven solo en el frontend (animaciones, skeletons, countdowns) con los datos que ya devuelven los endpoints existentes — no necesitan nada de ustedes.

**Una sola idea sí necesita un endpoint nuevo**, porque hoy no existe ningún lugar que devuelva "qué pasó últimamente" cruzando módulos: el frontend puede pedir eventos (`/agenda/eventos`), movimientos (`/finanzas/movimientos`), notas (`/notas`) o usuarios (`/usuarios`) por separado, pero no hay un feed combinado ordenado por fecha. Sin eso, no se puede construir un widget de "actividad reciente de tu iglesia" en el home sin hacer 4 requests y mezclarlos a mano en el cliente (fuente de bugs de paginación/orden, y no sabemos qué texto humano generar para cada tipo de evento sin lógica de dominio que ya vive del lado de ustedes).

## Qué necesitamos

Un endpoint nuevo:

```
GET /dashboard/actividad-reciente?limit=5
```

Respuesta esperada (array, ya ordenado por fecha descendente, ya filtrado a la iglesia del usuario autenticado — mismo criterio de tenancy que el resto de los endpoints):

```json
[
  {
    "id": "uuid-o-id-del-evento-de-actividad",
    "tipo": "EVENTO_CREADO",
    "descripcion": "Juan Pérez agendó \"Culto dominical\" para el 20 de julio",
    "actor": { "nombre": "Juan", "apellido": "Pérez" },
    "fecha": "2026-07-12T14:30:00.000Z",
    "entidadTipo": "evento",
    "entidadId": "id-del-evento-real"
  }
]
```

Notas sobre el shape:

- **`descripcion` ya viene armada en texto humano desde el backend** (no mandamos piezas sueltas para componerla en el cliente) — porque la lógica de qué verbo usar por tipo de acción (agendó / registró / completó / rechazó / agregó) es lógica de dominio, más fácil de mantener en un solo lugar del backend que replicada en el frontend.
- **`tipo`** es un enum abierto a que ustedes decidan la lista completa — como mínimo nos serviría cubrir: evento creado, movimiento financiero creado, nota/recordatorio completada, usuario del equipo creado. Si hay otros que sean naturales de agregar dado el modelo de datos que ya tienen (ej. predicador confirmado/rechazado), bienvenidos.
- **`entidadTipo` + `entidadId`** son opcionales pero muy útiles: nos permiten, a futuro, hacer que cada fila del feed sea un link al detalle real (ej. abrir el evento en la agenda). Si no es trivial de armar en esta primera versión, pueden omitirlos y lo agregamos como fase 2 — no bloquea el resto.
- **`actor`** puede ser `null` si la acción no tiene un usuario asociado de forma clara (ej. algo generado por un proceso automático, si existe algún caso así).

## Filtrado por rol — no asuman, avísennos qué decidieron

Cada módulo ya tiene su propio criterio de acceso por rol, y **no son iguales entre sí** (agenda: PASTOR/TESORERO/SECRETARIA — finanzas: PASTOR/TESORERO — notas: solo PASTOR — usuarios: solo PASTOR). Para este endpoint combinado, lo más simple y consistente es que cada fila del feed se filtre con el mismo criterio de rol que ya rige el módulo de origen de esa actividad (ej. una TESORERO no debería ver "Fulano completó la nota X" en su feed, porque tampoco tiene acceso a `/notas`). Pedimos que el filtrado lo apliquen ustedes en el backend (no que nos manden todo y filtremos en el cliente) — el mismo principio de "el backend no expone lo que el rol no debería ver" que ya se sigue en el resto de la API.

Si prefieren un criterio distinto (por ejemplo, que el pastor vea todo pero tesorero/secretaria solo vean su propio módulo sin mezclar), avísennos — no asumimos nada nuevo sobre roles sin confirmación explícita, mismo criterio que ya se usó para la propuesta de Colaboradores+QR (ver `docs/colaboradores-qr.md` en este mismo repo, donde se señaló explícitamente una asimetría de roles entre módulos en vez de copiar el patrón de otro).

Para `SUPER_ADMIN` no hace falta este endpoint — ya tiene su propio dashboard agregado (`/superadmin/dashboard`) fuera del scope de "actividad de una iglesia".

## Por qué esto y no algo en tiempo real (WebSocket/SSE)

Evaluamos proponer actualización en tiempo real (WebSocket o Server-Sent Events) para que el feed se actualice solo sin recargar. Decidimos **no pedirlo todavía**: hoy no hay ninguna infraestructura de tiempo real en ninguno de los dos lados (el frontend no tiene cliente de WebSocket, no usa ninguna librería de server-state con soporte de suscripciones tipo React Query), y es una pieza de arquitectura nueva no trivial para el valor que aporta en esta etapa. En su lugar, el frontend va a hacer **polling simple** (pedir este endpoint cada cierto intervalo, ej. cada 60 segundos, mientras el home esté abierto) — funciona con este mismo endpoint tal cual está especificado arriba, sin nada adicional de su parte. Si en el futuro el volumen de iglesias/usuarios simultáneos hace que el polling sea un problema real, ahí vale la pena reabrir la conversación de tiempo real — no antes.

## Cómo probar que quedó bien

1. Como PASTOR: crear un evento nuevo, registrar un movimiento financiero, y completar un recordatorio — los tres deberían aparecer en `GET /dashboard/actividad-reciente`, ordenados del más reciente al más antiguo, con `descripcion` en texto legible.
2. Como TESORERO de la misma iglesia: pedir el mismo endpoint y confirmar que el recordatorio completado (módulo notas, sin acceso para este rol) no aparece, pero sí el movimiento financiero y el evento.
3. Con `limit=2`: confirmar que devuelve solo los 2 más recientes, no trunca de forma rara ni rompe el orden.
4. Confirmar que un usuario de otra iglesia nunca ve actividad de esta iglesia (mismo aislamiento de tenancy que ya rige todo el resto de la API).

Cualquier duda sobre el shape exacto, respondan en este mismo archivo o en el canal que ya vienen usando para coordinar contrato de API — no bloqueamos ningún otro trabajo del frontend mientras tanto, porque el resto de las ideas de "app dinámica" de esta sesión no dependen de este endpoint.