# Frontend: respuesta al plan de Colaboradores + QR + convocatorias

Leí `docs/colaboradores-qr.md` completo. El plan encaja bien con patrones que ya tenemos (ruta pública por token como `/predicacion/[token]`, resumen parcial en vez de un booleano de éxito, honeypot + rate limit). Antes de arrancar a programar, tres cosas.

## Sobre "mismo criterio que agenda" para los roles

Dijiste que la propuesta de `PASTOR` + `SECRETARIA` para `/colaboradores` sigue "el mismo criterio que agenda", pero el acceso real a la sección Agenda en el frontend (`ROLES_CON_ACCESO` en `agenda/page.tsx`) es `PASTOR` + `TESORERO` + `SECRETARIA` — tres roles, no dos. No creo que sea un error tuyo, más bien una asimetría intencional que vale la pena confirmar explícitamente: gestionar una lista de contactos (nombre/email/teléfono de gente ajena al equipo administrativo) es un dato distinto al financiero/operativo de agenda, así que tiene sentido que el CRUD de colaboradores sea más restringido. Mi lectura, y con lo que voy a construir si no me dices lo contrario:

- `/colaboradores` (listado, editar, eliminar) y el panel de QR: `PASTOR` + `SECRETARIA`, como propusiste.
- `POST /agenda/eventos/:id/convocar`: los mismos roles que ya gestionan `agenda/eventos` (los 3), porque ahí no se administra la lista de contactos, solo se dispara un envío sobre un evento que `TESORERO` ya puede crear/editar hoy.

Avísame si el founder prefiere otra cosa — la decisión de negocio no me corresponde, pero técnicamente esto es lo consistente con los permisos que ya existen en la app.

## Tres cosas que necesito confirmar antes de programar

1. **Nombre exacto del campo honeypot** en el DTO de `POST /public/colaboradores/:qrToken` — para que el input oculto del formulario mande la misma key que ustedes esperan.
2. **`iglesiaLogoUrl`** en `GET /public/colaboradores/:qrToken` — ¿es un path relativo igual al `iglesia.logoUrl` que ya uso en el resto de la app (`${API_URL}${logoUrl}`)? Asumo que sí salvo que digas lo contrario.
3. **Rate limit (429)** en el `POST` público — ¿el body trae un mensaje legible tipo `{ message: "..." }` (mismo formato de error que uso en `ApiError`), o debo mostrar un texto genérico ("demasiados intentos, probá de nuevo en unos minutos") sin depender del body?

## Cómo lo voy a construir de mi lado

- `/colaboradores/registro/[qrToken]` y `/colaboradores/baja/[bajaToken]`: mismo patrón que ya tengo en `/predicacion/[token]` — ruta pública sin `useRequireAuth`. `apiFetch` ya funciona sin sesión tal cual está hoy: al no existir cookie `csrf_token` para un visitante anónimo, simplemente no manda el header `X-CSRF-Token`, así que no necesito un cliente HTTP aparte para estas rutas públicas.
- Panel "Colaboradores" en el dashboard: voy a agregar `qrcode` (liviana, sin dependencias transitivas raras) para generar el QR 100% del lado del cliente a partir de la URL que devuelve `GET /iglesias/mi-iglesia/qr`, con descarga como PNG.
- El botón "Convocar" en el detalle de evento lo construyo desde el día 1 esperando el resumen completo `{ destinatarios, whatsapp, email }`, aunque WhatsApp (fase 3) todavía no mande nada real — así no rehago la UI cuando esa fase quede lista, solo van a cambiar los números.

## Fases

De acuerdo con las 3 que propusiste. Empiezo por CRUD + QR + registro público en cuanto confirmes los 3 puntos de arriba; engancho la convocatoria por email apenas esté ese endpoint; dejo el bloque de WhatsApp construido pero inerte hasta que el trámite con Meta esté listo.

Avísame cualquier cosa antes de que empiece a escribir código.
