# Prompt para el frontend: Reporte financiero mensual a la congregación

> Pega este archivo completo en una sesión de Claude Code abierta en el repo del **frontend**
> (`Evangelicapp/frontend`, Next.js). El backend ya está implementado (2026-11-26). Este
> documento describe **todo** lo que falta en el frontend, con los contratos exactos de la API.
>
> **Importante:** esta feature **NO se documenta en la tesis** (Daily, backlog, sprints,
> informe, presentación) hasta que el autor lo pida. Sí se registra en el `FEATURES.md` del
> frontend, como cualquier cambio.

---

## 1. Qué es la feature

El pastor (rol `MANAGER`) puede **encender un interruptor** para que, cada mes, la iglesia
envíe por correo un **reporte financiero resumido** a los integrantes (congregantes) que
**aceptaron recibirlo**.

Reglas de negocio que el frontend tiene que reflejar (el backend ya las aplica):

1. **Voluntario:** el interruptor nace **apagado**. Solo el `MANAGER` lo ve y lo cambia. Un
   `USUARIO` (aunque tenga acceso a Finanzas) **no** ve esta pantalla: el backend le responde 403.
2. **Solo con consentimiento:** solo reciben el correo los integrantes que marcaron el checkbox
   de consentimiento en el formulario del QR. El equipo **no puede** marcarlo por ellos (a
   propósito, por la ley de datos personales). Cada correo trae un link "Dejar de recibirlo".
3. **Solo totales:** el correo muestra ingresos, egresos, balance del mes y totales por
   categoría. **Nunca** aportes individuales, descripciones de movimientos ni nombres.
4. **Categorías ocultas:** el pastor puede ocultar categorías sensibles. Su monto **no
   desaparece**: se suma en una línea "Otros ingresos" / "Otros egresos" (los totales siempre
   cuadran con el dashboard de Finanzas).
5. **Envío automático:** el **día 1 de cada mes a las 10:00 (hora de Chile)** se envía el reporte
   del mes anterior a las iglesias con el interruptor encendido. Si ese día falla, el backend
   reintenta hasta el día 7. Si el pastor lo enciende a mitad de mes, el primer envío automático
   es el día 1 del mes siguiente (el del mes pasado lo puede mandar a mano).
6. **Enviar ahora (manual):** el pastor puede mandar a mano el reporte de cualquier mes **ya
   cerrado** de los **últimos 12 meses**, aunque el interruptor esté apagado.
7. **Un mes se envía una sola vez** por iglesia (automático o manual). Si ya salió, el backend
   responde 409.

---

## 2. Contratos de la API

Todas las rutas autenticadas usan `apiFetch` de `src/lib/api.ts` como siempre (cookies +
header CSRF en las mutaciones). Montos en **pesos chilenos** (`number`, pueden traer 2
decimales). Fechas en ISO 8601. Los períodos son strings `YYYY-MM` (ej. `"2026-10"`).

### Tipos (agregarlos en `src/components/finanzas/types.ts` o un archivo nuevo `src/components/finanzas/reporte-congregacion/types.ts`)

```ts
export type TipoMovimiento = "INGRESO" | "EGRESO"; // probablemente ya existe: reutilizarlo
export type OrigenEnvioReporte = "AUTOMATICO" | "MANUAL";

export interface TotalPorCategoria {
  categoria: string;
  total: number;
}

export interface ReporteFinancieroData {
  periodo: string; // "YYYY-MM"
  totales: { ingresos: number; egresos: number; balance: number };
  ingresosPorCategoria: TotalPorCategoria[]; // ordenadas de mayor a menor; "Otros ingresos" va al final si existe
  egresosPorCategoria: TotalPorCategoria[];
}

export interface EnvioReporte {
  id: string;
  periodo: string;
  origen: OrigenEnvioReporte;
  destinatarios: number;       // integrantes con consentimiento al momento del envío
  enviados: number | null;     // null mientras el envío sigue en curso
  fallidos: number | null;     // null mientras el envío sigue en curso
  completadoEn: string | null; // null = todavía enviando
  createdAt: string;
  enviadoPor: { nombre: string; apellido: string } | null; // null en los automáticos
}

export interface EnvioReporteConSnapshot extends EnvioReporte {
  snapshot: ReporteFinancieroData; // los números tal como salieron en el correo
}

export interface CategoriaReporte {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  ocultaEnReporte: boolean;
  departamento: { id: string; nombre: string } | null; // null = finanzas general
}

export interface ConfiguracionReporte {
  activo: boolean;
  activadoEn: string | null;
  activadoPor: { nombre: string; apellido: string } | null;
  destinatarios: { aceptan: number; totalIntegrantes: number };
  proximoEnvioAutomatico: string | null; // null si está apagado
  periodoSugerido: string;               // último mes cerrado, ej. "2026-10"
  mesesAtrasPermitidos: number;          // 12
  categorias: CategoriaReporte[];
  ultimoEnvio: EnvioReporte | null;
}

export interface VistaPreviaReporte {
  periodo: string;
  reporte: ReporteFinancieroData;
  destinatarios: number;
  envioExistente: EnvioReporte | null; // si ese mes ya se envió
  asunto: string;
  html: string; // HTML exacto del correo (con saludo de ejemplo "Hola María")
}

export interface SuscripcionReporte {
  nombreIglesia: string;
  logoUrl: string | null;
  suscrito: boolean;
}
```

### Endpoints del pastor (solo `MANAGER`)

| Método | Ruta | Body / Query | Respuesta | Errores |
|---|---|---|---|---|
| GET | `/finanzas/reporte-congregacion` | — | `ConfiguracionReporte` | 403 si no es MANAGER |
| PATCH | `/finanzas/reporte-congregacion` | `{ activo: boolean }` | `ConfiguracionReporte` (ya actualizada) | 400 si `activo` no es boolean |
| PUT | `/finanzas/reporte-congregacion/categorias-ocultas` | `{ categoriaIds: string[] }` (lista **completa** de las ocultas; las que no vengan vuelven a mostrarse) | `ConfiguracionReporte` | 400 si algún id no es de la iglesia |
| GET | `/finanzas/reporte-congregacion/vista-previa?periodo=YYYY-MM` | `periodo` opcional (default: último mes cerrado) | `VistaPreviaReporte` | 400 si el período no está cerrado o tiene más de 12 meses |
| POST | `/finanzas/reporte-congregacion/enviar` | `{ periodo?: "YYYY-MM" }` (default: último mes cerrado) | **202** + `EnvioReporte` (con `completadoEn: null`: los correos salen en segundo plano) | 400 período inválido · 400 "Ningún integrante ha aceptado recibir el reporte todavía…" · **409** "El reporte de ese mes ya se envió a la congregación" |
| GET | `/finanzas/reporte-congregacion/envios` | — | `EnvioReporteConSnapshot[]` (últimos 24, más reciente primero) | — |

Mostrar siempre el `message` que devuelve el backend en los errores 400/409 (ya viene en
español y listo para el usuario).

### Endpoints públicos (sin sesión): link "Dejar de recibirlo"

| Método | Ruta | Respuesta | Errores |
|---|---|---|---|
| GET | `/reporte-financiero/suscripcion/:token` | `SuscripcionReporte` | 404 "Enlace no válido" · 429 (20 req/min por IP) |
| POST | `/reporte-financiero/suscripcion/:token/baja` | `SuscripcionReporte` con `suscrito: false` | 404 · 429 |
| POST | `/reporte-financiero/suscripcion/:token/reactivar` | `SuscripcionReporte` con `suscrito: true` | 404 · 429 |

Los dos POST son idempotentes y están **exentos de CSRF** en el backend.

### Cambios en endpoints existentes

- **`POST /integrantes/registro/:qrToken`** (formulario público del QR, multipart): acepta un
  campo nuevo **opcional** `aceptaReporteFinanciero`. Solo cuenta como consentimiento si llega
  el string `"true"`; si no se manda, queda en `false`.
- **`GET /integrantes`**: cada integrante trae dos campos nuevos:
  `aceptaReporteFinanciero: boolean` y `aceptaReporteFinancieroEn: string | null`.

---

## 3. Cambios en el frontend, paso a paso

### 3.1 `src/lib/api.ts`: exentar de CSRF las rutas públicas nuevas

Agregar a `CSRF_EXEMPT_PATHS` (mismo motivo que las demás rutas públicas por token):

```ts
/^\/reporte-financiero\/suscripcion\/[^/]+\/(baja|reactivar)$/,
```

### 3.2 `src/components/layout/app-shell.tsx`: página pública sin navbar

Agregar a la condición de rutas sin shell:

```ts
pathname.startsWith("/reporte-financiero/") ||
```

Revisar también el middleware o el guard de auth del frontend (si existe uno que redirige a
`/login` sin sesión) para que `/reporte-financiero/baja/*` sea **pública**, igual que
`/predicacion/*` o `/integrantes/registro/*`.

### 3.3 Página pública nueva: `src/app/reporte-financiero/baja/[token]/page.tsx`

Es el destino del link "Dejar de recibirlo" de cada correo
(`${FRONTEND_URL}/reporte-financiero/baja/<token>`). Copiar el estilo de
`src/app/predicacion/[token]` o `src/app/integrantes/registro/[qrToken]` (logo de la iglesia
centrado, tarjeta simple, mobile first: la mayoría la va a abrir desde el celular).

Comportamiento:

1. Al montar: `GET /reporte-financiero/suscripcion/:token`.
   - Cargando → skeleton.
   - 404 → "Este enlace no es válido o ya no existe." (sin botones).
   - 429 → "Demasiados intentos, prueba de nuevo en un minuto."
2. Si `suscrito === true`: mostrar
   - Título: **"¿Dejar de recibir el reporte financiero?"**
   - Texto: "Ya no recibirás por correo el reporte financiero mensual de **{nombreIglesia}**."
   - Botón principal (rojo/destructivo): **"Sí, dejar de recibirlo"** → `POST …/baja`.
   - **No** dar de baja automáticamente al abrir la página: los filtros antispam abren los
     links de los correos solos. Siempre pedir el clic.
3. Si `suscrito === false` (ya dado de baja, o después de confirmar):
   - Ícono de check. Título **"Listo, ya no recibirás el reporte"**.
   - Texto: "Si fue un error, puedes volver a suscribirte."
   - Botón secundario: **"Volver a suscribirme"** → `POST …/reactivar` → vuelve al estado del punto 2
     con un toast "Te volviste a suscribir".
4. Deshabilitar los botones mientras la request está en curso.

### 3.4 Formulario público del QR: `src/app/integrantes/registro/[qrToken]/page.tsx`

Agregar un **checkbox opcional, desmarcado por defecto** (nunca premarcado: el
consentimiento tiene que ser explícito), antes del botón de enviar:

> ☐ Acepto recibir por correo el **reporte financiero mensual** de la iglesia (solo totales,
> sin datos personales). Puedo darme de baja cuando quiera desde el mismo correo.

- Agregar `aceptaReporteFinanciero: boolean` (default `false`) al estado/schema del formulario
  (zod o el que se use).
- En el submit, junto a los otros `formData.append(...)`:

  ```ts
  if (values.aceptaReporteFinanciero) formData.append("aceptaReporteFinanciero", "true");
  ```

- No es obligatorio: el formulario se envía igual sin marcarlo.
- Si ya hay un link a la política de privacidad en ese formulario
  (`NEXT_PUBLIC_URL_POLITICA_PRIVACIDAD`), dejarlo cerca del checkbox.

### 3.5 Listado de integrantes: `src/app/integrantes/page.tsx`

- Agregar `aceptaReporteFinanciero` y `aceptaReporteFinancieroEn` al tipo de
  `src/components/integrantes/types.ts`.
- Mostrar una columna o badge pequeño **"Recibe reporte"** (verde) / "—" por integrante, con
  tooltip "Aceptó el {fecha}" cuando corresponda.
- **Solo lectura.** No agregar ningún control para cambiarlo: el consentimiento solo lo puede
  dar o quitar la propia persona (por el QR o por el link del correo). Si el pastor pregunta
  cómo sumar a alguien ya registrado, la respuesta es: esa persona tiene que darse de alta con
  el QR marcando el checkbox… **ojo:** hoy, si la persona ya está registrada (mismo email o
  RUN), el backend NO actualiza su consentimiento al reenviar el formulario. Mostrar en la
  pantalla de configuración (3.6) un texto de ayuda que lo explique de forma simple (ver ahí).

### 3.6 Pantalla nueva del pastor: Reporte a la congregación

**Ruta sugerida:** `src/app/finanzas/reporte-congregacion/page.tsx`.

**Acceso:** visible solo si `user.rol === "MANAGER"`. Agregar la entrada en la navegación de
Finanzas (donde están "Analítica" y "Departamentos"), con ícono de sobre/correo (lucide
`Mail` o `Send`), texto **"Reporte a la congregación"**. Para `USUARIO` no mostrar el link;
si entra por URL directa, el backend responde 403 → redirigir a `/finanzas` o mostrar "Solo el
pastor puede configurar el reporte".

Al montar: `GET /finanzas/reporte-congregacion` y `GET /finanzas/reporte-congregacion/envios`
en paralelo.

La página tiene 4 secciones (cards):

#### A) Card "Envío automático" (el interruptor)

- `Switch` de shadcn con label **"Enviar el reporte financiero cada mes a la congregación"**.
- Debajo, texto según el estado:
  - Encendido: "Se envía automáticamente el día 1 de cada mes. Próximo envío:
    **{proximoEnvioAutomatico formateado, ej. 1 de diciembre de 2026}**. Activado por
    {activadoPor.nombre} {activadoPor.apellido} el {activadoEn}."
  - Apagado: "Apagado. No se enviará nada automáticamente."
- **Al encender:** abrir primero un `AlertDialog` de confirmación:
  - Título: "¿Activar el reporte mensual?"
  - Texto: "Cada día 1 se enviará a los **{destinatarios.aceptan}** integrantes que aceptaron
    recibirlo un resumen con los ingresos, egresos y el balance del mes anterior, con totales
    por categoría. Nunca se incluyen aportes individuales. Te recomendamos revisar la vista
    previa antes."
  - Botones: "Cancelar" / "Ver vista previa" (cierra y hace scroll a la sección C) / "Activar".
  - "Activar" → `PATCH { activo: true }` → reemplazar el estado con la respuesta → toast
    "Reporte mensual activado".
- **Al apagar:** sin confirmación → `PATCH { activo: false }` → toast "Reporte mensual
  desactivado".
- Update optimista opcional; si falla, revertir el switch y mostrar el error.

#### B) Card "Destinatarios"

- Número grande: **{aceptan}** de {totalIntegrantes} integrantes aceptaron recibir el reporte.
- Barra de progreso simple (aceptan / total).
- Si `aceptan === 0`: alerta amarilla "Todavía nadie ha aceptado recibir el reporte. Los
  integrantes lo aceptan al registrarse con el QR de la iglesia." + botón "Ver QR" que abre
  el `qr-dialog.tsx` existente de integrantes (o link a `/integrantes`).
- Texto de ayuda pequeño (colapsable "¿Cómo se suman más personas?"): "Cada persona acepta al
  registrarse con el QR marcando la casilla del reporte financiero. Por privacidad, el equipo
  no puede suscribir a nadie, y quienes ya estaban registrados antes de esta opción todavía no
  pueden sumarse por su cuenta (lo resolveremos en una próxima versión)." Ajustar el texto si
  se prefiere otra forma, pero sin prometer algo que el sistema no hace.

#### C) Card "Vista previa y envío manual"

- Selector de mes (`Select`): los últimos `mesesAtrasPermitidos` meses cerrados, del más
  reciente al más antiguo, con label en español ("Octubre 2026"). Default: `periodoSugerido`.
  Generarlos en el frontend a partir del mes actual (excluir el mes en curso).
- Al cambiar el mes (y al montar): `GET /finanzas/reporte-congregacion/vista-previa?periodo=…`.
- Mostrar:
  1. Resumen en números arriba (3 mini-stats: Ingresos, Egresos, Balance; balance en rojo si es
     negativo). Formatear con `Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" })`.
  2. El correo tal como llega, dentro de un `<iframe>`:

     ```tsx
     <iframe
       title="Vista previa del correo"
       srcDoc={vistaPrevia.html}
       sandbox=""            // sin scripts ni navegación: es solo para mirar
       className="w-full h-[640px] rounded-md border bg-white"
     />
     ```

     Encima del iframe, mostrar el asunto: "Asunto: {asunto}". Debajo, nota gris: "Así lo verá
     cada integrante (con su propio nombre en el saludo)."
  3. Si el mes no tiene movimientos (totales en 0 y listas vacías), aviso: "Este mes no tiene
     movimientos registrados; el reporte saldría en cero."
- Botón **"Enviar ahora"**:
  - Deshabilitado si `envioExistente !== null` → en ese caso mostrar badge "Ya enviado el
    {createdAt} ({origen === 'AUTOMATICO' ? 'automático' : 'manual'})".
  - Deshabilitado si `destinatarios === 0` (tooltip: "Nadie ha aceptado recibirlo todavía").
  - Al hacer clic: `AlertDialog` "¿Enviar el reporte de {mes} a {destinatarios} integrantes?
    Esta acción no se puede deshacer y cada mes se puede enviar una sola vez." → "Enviar".
  - `POST /finanzas/reporte-congregacion/enviar { periodo }`:
    - 202 → toast "Enviando el reporte a {destinatarios} integrantes…", agregar el envío al
      historial (sección D) en estado "Enviando…" y empezar el polling (ver D).
    - 409 → toast de error con el mensaje y recargar la vista previa (otro envío ganó).
    - 400 → toast con el mensaje.

#### D) Card "Historial de envíos"

- Tabla con `GET /finanzas/reporte-congregacion/envios`: Mes · Tipo (badge
  "Automático"/"Manual") · Enviado por · Fecha · Resultado.
- Columna Resultado:
  - `completadoEn === null` → spinner + "Enviando… ({destinatarios} destinatarios)".
  - Si no → "{enviados} enviados" y, si `fallidos > 0`, badge rojo "{fallidos} fallidos" con
    tooltip "Algunos correos no se pudieron entregar (casilla inválida o error del proveedor)".
- **Polling:** mientras exista algún envío con `completadoEn === null`, recargar
  `GET …/envios` cada 5 segundos; detenerlo cuando todos estén completos o tras 10 minutos.
  Limpiar el intervalo al desmontar.
- Cada fila se puede expandir (o abrir un `Dialog`) para ver el `snapshot`: los totales y las
  categorías tal como salieron en ese correo (aunque después se hayan editado movimientos).
- Estado vacío: "Todavía no se ha enviado ningún reporte."

#### E) Card "Categorías visibles en el reporte"

- Dos columnas o dos grupos: **Ingresos** y **Egresos**, con un checkbox por categoría de
  `config.categorias` (marcado = **se muestra**; desmarcado = oculta). Si la categoría es de
  un departamento, mostrar su nombre en gris al lado ("Ofrendas · Jóvenes").
- Texto explicativo: "Las categorías que desmarques no aparecerán por nombre en el reporte: su
  monto se sumará en 'Otros ingresos' u 'Otros egresos'. Los totales no cambian."
- Botón "Guardar cambios" (habilitado solo si hay cambios) →
  `PUT …/categorias-ocultas { categoriaIds: [ids de las DESMARCADAS] }` → reemplazar el estado
  con la respuesta → toast "Categorías actualizadas" → recargar la vista previa (sección C).
- Ojo con la inversión: la UI muestra "visible", la API recibe la lista de **ocultas**.

### 3.7 Política de privacidad: `src/app/politica-privacidad`

Agregar un párrafo: si la persona lo acepta en el formulario del QR, la iglesia usa su correo
para enviarle un reporte financiero mensual con totales agregados (sin datos personales ni
aportes individuales), y puede revocar ese consentimiento en cualquier momento con el link
"Dejar de recibirlo" de cada correo.

---

## 4. Lo que NO hay que hacer

- No mostrar ni pedir datos individuales de aportes en ninguna parte de esta feature.
- No permitir que el pastor ni el equipo marquen o desmarquen el consentimiento de un
  integrante.
- No dar de baja con un GET ni al cargar la página pública: siempre con clic.
- No renderizar `vistaPrevia.html` con `dangerouslySetInnerHTML` en el DOM principal; usar el
  `<iframe sandbox="">`.
- No calcular los números del reporte en el frontend: siempre los que devuelve el backend.
- No mostrar la sección a `USUARIO`.

---

## 5. Checklist de prueba manual

1. Como `USUARIO` con acceso a Finanzas: no aparece "Reporte a la congregación"; por URL directa
   se ve el aviso o la redirección.
2. Como `MANAGER`: la pantalla carga con el interruptor apagado, 0 destinatarios y el mes
   sugerido = mes anterior.
3. Registrar un integrante por el QR **con** el checkbox → en la pantalla, destinatarios sube a 1;
   en `/integrantes` aparece "Recibe reporte".
4. Registrar otro **sin** el checkbox → destinatarios no cambia.
5. Ocultar una categoría con movimientos en el mes → la vista previa la muestra en "Otros…" y
   los totales no cambian.
6. Encender el interruptor → confirmación → queda encendido con la fecha del próximo envío.
7. "Enviar ahora" el mes anterior → 202, aparece en el historial "Enviando…", y después
   "N enviados". Llega el correo a la casilla de prueba.
8. Volver a "Enviar ahora" el mismo mes → botón deshabilitado ("Ya enviado"); si se fuerza, 409.
9. Abrir el link "Dejar de recibirlo" del correo → página pública sin navbar → confirmar →
   "Listo" → "Volver a suscribirme" funciona → volver a darse de baja.
10. Probar la página pública con un token inventado → "Este enlace no es válido".
11. Probar la página pública con una sesión de pastor abierta en el mismo navegador → los POST
    funcionan sin redirigir a `/login` (exención CSRF del paso 3.1).
12. Mobile: la página pública y la pantalla del pastor se ven bien a 375px de ancho.

---

## 6. Notas del backend (contexto, no requieren acción)

- Los correos salen de a 2 por segundo (límite del proveedor), así que con muchos destinatarios
  el envío tarda algunos minutos: por eso el 202 y el polling.
- La migración de base de datos (`20261126120000_add_reporte_financiero_congregacion`) se
  tiene que aplicar en producción antes de desplegar el frontend; hasta entonces estos
  endpoints fallan. Coordinar con el backend antes de publicar.
