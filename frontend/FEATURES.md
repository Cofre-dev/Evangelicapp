# Registro de cambios

Bitácora técnica de este repo (frontend). Cada sesión de trabajo relevante agrega una entrada nueva **arriba de todo**, con fecha en formato `YYYY-MM-DD`. El objetivo es que cualquier modelo o persona que retome el proyecto entienda qué se hizo y **por qué**, sin tener que reconstruirlo desde `git log`.

Formato de cada entrada: qué cambió, por qué, y qué queda pendiente o abierto (si aplica). No es un changelog de usuario final — es contexto de ingeniería.

---

## 2026-07-12 (continuación 4) — Implementación de la auditoría/spec anterior: fixes, hero del home, "app dinámica", tablas responsive

Implementación de lo planteado en la entrada anterior (`continuación 3`), en el orden de prioridad pedido. **No se tocó nada relacionado al endpoint `GET /dashboard/actividad-reciente` propuesto en `frontend/prompt.md`** — no existe en el backend todavía, sigue siendo pura propuesta.

**Prioridad 1 — fixes de consistencia:**
- **`src/app/superadmin/iglesias/[id]/page.tsx`** (~línea 158): grid de "Creada"/"Visitantes promedio" bajado de `grid-cols-2 sm:grid-cols-3` a `grid-cols-2 sm:grid-cols-2` — ya no deja una tercera columna vacía en tablet/desktop.
- **`src/components/agenda/evento-dialog.tsx`**: aplicado el mismo patrón de confirmación de borrado que ya tenía `nota-dialog.tsx` (booleano `confirmandoEliminar`, reseteado en el `useEffect` que resetea el diálogo al abrir, panel de confirmación reemplazando el `<Form>` completo). El botón "Eliminar" ya no llama `handleDelete` directo.
- **`src/app/page.tsx`**: se agregaron estados `loadingTareas`, `loadingBalance`, `loadingMiembros`, `loadingStatsSuperAdmin` (mismo patrón que el `loadingEventos` ya existente) y un derivado `loadingResumen` para la sección completa. El banner de tareas pendientes ahora muestra un skeleton (`animate-pulse`) mientras carga en vez de aparecer de golpe o no aparecer nunca; la sección "Resumen" muestra dos `ResumenTileSkeleton` mientras carga. Ambos casos están gateados por el chequeo de rol correspondiente (`ROLES_CON_TAREAS`/`ROLES_CON_RESUMEN`) para que el skeleton no parpadee un instante en roles que nunca van a mostrar esa sección (ej. `SUPER_ADMIN` nunca ve el banner de tareas).

**Prioridad 2 — hero del home (Variante A, dentro de la gama celeste):** en `src/app/page.tsx`, sobre el panel hero existente:
- **Rayos de luz**: 3 `div`s `absolute inset-y-0` (no `h-[…%]`, que no resuelve de forma fiable sobre un contenedor de altura automática — se ancló con `inset-y-0` para que siempre cubran el alto real del panel) con gradiente lineal de `hsl(var(--primary)/0.X)`/`hsl(var(--accent)/0.X)` a transparente, rotados y con `blur-xl`, opacidad baja a propósito (verificado visualmente que no compiten con el saludo).
- **Silueta de cordillera**: `<svg>` inline con un `<path>` de picos, `viewBox="0 0 400 100"` + `preserveAspectRatio="none"` para que se estire al ancho real sin depender de un tamaño fijo en px, `fill="hsl(var(--primary)/0.12)"`, `absolute bottom-0`.
- **Shimmer sutil**: nueva keyframe `shimmer` agregada a `tailwind.config.ts` (`extend.keyframes`/`extend.animation`, no es una dependencia nueva — es la misma vía que ya usa el proyecto para `tailwindcss-animate`) que anima `background-position` de un gradiente diagonal de brillo. Se aplica con `motion-safe:animate-shimmer` — verificado con Playwright (`reducedMotion: "reduce"` en el contexto del navegador) que el `animation-name` computado pasa a `none` cuando el usuario pidió reducir movimiento.
- Todo el contenido de texto existente (saludo, rol, fecha, logo/nombre de iglesia) se movió a `relative z-10` para quedar por encima de las capas decorativas nuevas, que no llevan z-index explícito.

**Prioridad 3 — "app dinámica":**
1. **Conteo ascendente**: nuevo hook `src/hooks/use-count-up.ts` (`requestAnimationFrame`, easeOutCubic, anima desde el valor anterior — 0 la primera vez — hasta el valor real; respeta `prefers-reduced-motion` fijando el valor directo si el usuario lo pidió). `ResumenTile` (`src/app/page.tsx`) cambió su prop `value` de `string` (ya formateado) a `number` crudo + un `formato?: (n: number) => string` opcional (default `String`), para poder animar el número y solo formatearlo (ej. `formatoCLP.format`) en el render.
2. **Entrada escalonada (stagger)**: `animate-in fade-in slide-in-from-bottom-1` de `tailwindcss-animate` + `style={{ animationDelay: `${i * 40}ms` }}` en: `src/components/agenda/proximos-eventos.tsx` (lista de eventos), `src/app/notas/page.tsx` (`RecordatorioRow` y `NotaLargaRow`, ambos con nuevo prop `index`), `src/app/finanzas/page.tsx` (filas de tabla y tarjetas mobile de movimientos).
3. **Micro-interacciones**: `active:scale-[0.98]` (o `[0.99]` en filas más chicas) + `transition-all`/`transition-transform` agregado puntualmente a `ResumenTile`, el banner de tareas pendientes, `RecordatorioRow`/`NotaLargaRow`, `MovimientoCard` (mobile) y los botones principales "Nuevo movimiento"/"Nuevo recordatorio" — **no se tocó el primitivo compartido `src/components/ui/button.tsx`**, a propósito, para no aplicarlo indiscriminadamente a todos los botones de la app.
4. **Countdown de próximo culto**: `formatoCountdown` en `src/components/agenda/proximos-eventos.tsx`, calculado 100% en cliente sobre `eventos[0]` (ya ordenado ascendente por el `page.tsx`) — "En curso ahora" / "Hoy a las HH:MM" / "Mañana a las HH:MM" / "Faltan N días". Sin fetch nuevo.
5. **Comparación de balance vs. mes anterior**: `cargarBalanceMes` en `src/app/page.tsx` ahora hace `Promise.all` de dos llamadas a `/finanzas/movimientos/dashboard` (mes actual + mes calendario anterior, mismo endpoint ya usado); la del mes anterior tiene su propio `.catch(() => null)` para que si falla, el balance del mes actual igual se muestre (solo sin la comparación). Nuevo componente `ComparacionBalance` muestra "±N% vs. mes pasado" con ícono `ArrowUpRight`/`ArrowDownRight` y color emerald/rose; se oculta si no hay dato del mes anterior o si este es 0 (evita división por cero).

**Prioridad 4 — tablas responsive (parcial, a propósito):** se implementó **solo en `src/app/finanzas/page.tsx`** (la tabla de "Movimientos"): nuevo componente `MovimientoCard` para una lista de tarjetas en mobile (`sm:hidden`), la tabla real se mantiene desde `sm:` hacia arriba (`hidden sm:block`) — mismo patrón que sugiere shadcn/ui para tablas responsive. **Pendiente, no implementado**: `src/app/usuarios/page.tsx` y `src/app/superadmin/page.tsx` siguen usando `overflow-auto` con scroll horizontal en mobile — mismo alcance que ya estaba señalado como pendiente en las entradas de `2026-07-11` y `2026-07-12 (continuación 3)`. Se priorizó finanzas por ser, según el pedido original, el módulo más usado.

**Verificación visual — a diferencia de sesiones anteriores, esta vez SÍ hubo navegador real disponible** (`playwright` con Chromium ya descargado en el entorno, vía `npx`, aunque no como dependencia del repo — se usó `NODE_PATH` apuntando al caché de `npx` para poder `require("playwright")` desde un script suelto). Se verificó de punta a punta contra el backend real corriendo local:
- Login real como `admin`/`SuperAdmin123` (seed del backend) para el hero: capturas en mobile (390px) y desktop (1440px), cero errores de consola, shimmer confirmado animando (dos capturas de la misma zona con 3.5s de diferencia muestran el brillo desplazado) y confirmado que se apaga bajo `prefers-reduced-motion: reduce`.
- Se creó una iglesia + pastor de prueba real vía `POST /iglesias` (usando la sesión de `admin`) para poder probar los flujos exclusivos de `PASTOR` (balance, countdown, notas, agenda, finanzas) — se completaron los modales obligatorios de cambio de contraseña y onboarding vía la UI real, y se sembraron un evento, dos categorías y dos movimientos (mes actual y mes anterior) vía requests directas a la API reusando las cookies de sesión del navegador. Con eso se confirmó visualmente: countdown "Mañana a las 07:00 p. m." en Próximos Eventos, comparación "+50% vs. mes pasado" en el balance, tarjetas de movimiento en mobile y tabla en desktop en Finanzas, y el flujo de confirmar-antes-de-eliminar funcionando tanto en notas como en el evento de agenda (con "Cancelar" verificado explícitamente: el registro sigue existiendo después).
- **Efecto secundario, no revertido**: quedó en la base de datos de desarrollo local una iglesia de prueba ("Iglesia Test Verificacion", con la comuna mal codificada como "Ñuñoa" por un `curl` sin el encoding correcto — cosmético, no relacionado a ningún cambio de código) con un pastor (`ptest001`), un evento, dos categorías y varios movimientos de prueba. No existe un endpoint de borrado de iglesias en el backend (`iglesias.controller.ts` solo expone `POST` y `GET :id`), así que no se pudo limpiar vía API; queda para quien administre esa base de datos local decidir si lo borra a mano.
- **Nota sobre `admin`**: sus credenciales (usuario `admin` / `SuperAdmin123`) vienen del seed del backend (`prisma/seed.ts` en el repo del backend) — no se modificó ninguna contraseña existente real de este entorno.

Comandos corridos y verificados sin errores después de cada prioridad: `npm run lint`, `npm run typecheck`, `npm run build` (dentro de `frontend/`).

---

## 2026-07-12 (continuación 3) — Auditoría visual completa + spec del hero del home + ideas de "app dinámica" (sin implementar)

Un agente `ux-ui-expert` hizo un escaneo completo de la interfaz (todas las rutas) a pedido explícito del usuario, con tres encargos puntuales: (1) auditoría de consistencia visual construyendo sobre los 19 hallazgos de la entrada `2026-07-11` y revisando qué se pudo haber introducido en los cambios de hoy (dashboard "Resumen", drawer del navbar); (2) spec de un nuevo fondo "evocador" para el hero del home (pedido original del usuario: "una imagen de Dios de fondo"); (3) ideas de micro-interacciones/"app dinámica" con el stack actual. **Es un informe de auditoría y una especificación de diseño — no se tocó ningún componente de UI todavía.** La implementación queda para una sesión futura con `tech-lead-frontend` (para las piezas que tocan fetching/estado) y `ux-ui-expert`/implementación directa (para las puramente visuales).

**Sobre "imagen de Dios de fondo" — interpretación deliberada, no literal**: la tradición evangélica/protestante (a diferencia de la católica u ortodoxa) evita representar a Dios de forma literal, no existe una fotografía real utilizable, y generar una imagen fabricada de una figura religiosa es territorio sensible que se evitó a propósito. Se interpretó la intención real (presencia espiritual, calidez, trascendencia en la primera pantalla) con motivos ya validados en el proyecto: luz de amanecer, cielo abierto/rayos de luz, silueta de cordillera — construidos con gradientes CSS + SVG inline, **sin fotografía y sin dependencias nuevas** (no existe carpeta `public/` en el repo hoy; los únicos `<Image>` existentes sirven logos de iglesia vía `NEXT_PUBLIC_API_URL`). Spec completa entregada al usuario en el chat de esta sesión (dos variantes de paleta: A, dentro de la gama celeste ya establecida; B, con un cálido dorado/amanecer superpuesto solo en ese hero — variante B es una desviación consciente y acotada del sistema de color, señalada como tal).

**Hallazgos nuevos de la auditoría** (no estaban en la entrada de `2026-07-11`):
- **Home (`src/app/page.tsx`)**: la sección "Resumen" y el aviso de tareas pendientes no tienen estado de carga (aparecen de golpe o nunca, sin spinner) — inconsistente con "Próximos eventos" en la misma página, que sí muestra `Loader2` mientras carga. Media severidad, se resuelve como parte de la idea de skeletons de la sección "app dinámica" de abajo.
- **`src/app/superadmin/iglesias/[id]/page.tsx`** (~línea 158): el grid de "Creada"/"Visitantes promedio" usa `grid-cols-2 sm:grid-cols-3` pero solo hay 2 celdas — deja un hueco vacío en tablet/desktop. Menor, fix de una línea (bajar a `sm:grid-cols-2` o agregar un tercer dato).
- **`src/components/agenda/evento-dialog.tsx`** (~línea 484): re-confirmado como pendiente (ya señalado en la entrada anterior) — "Eliminar" sigue sin confirmación, a diferencia de notas (ya resuelto hoy) y movimientos (ya lo tenía). Es la única acción destructiva de la app sin ese resguardo.
- **Colores de categoría sin token central**: `TIPO_EVENTO_CHIP_CLASS` (agenda), los badges de notas (violeta para "asignado a", rojo para "vencida") y los de finanzas/superadmin usan clases Tailwind crudas repetidas por archivo, con el mismo tono (ej. violeta) reutilizado para conceptos distintos en módulos distintos. No genera colisión visual real (pantallas distintas) pero es deuda de mantenibilidad — se sugiere un mapa de color por categoría compartido a futuro. Baja severidad.
- **`ResumenTile` (home) vs `StatTile` (finanzas/superadmin)**: mismo patrón visual, pero `ResumenTile` es un link con hover (`-translate-y-0.5`) mientras los `StatTile` son estáticos — diferencia de afordancia deliberada (uno linkea a un módulo, los otros no) pero vale documentarla para que no se lea como inconsistencia accidental.
- **Tablas en mobile (finanzas/usuarios/superadmin) siguen sin ser responsive** (`overflow-auto` con scroll horizontal en vez de un layout que se adapte) — ya estaba señalado como pendiente el 2026-07-11, se re-eleva de prioridad acá porque es la brecha mobile/desktop más grande que queda abierta, y el pedido de esta sesión fue explícito ("no debe haber mucha diferencia" entre mobile y desktop, mismo criterio ya aplicado hoy al navbar).

**Diferencias mobile/desktop evaluadas y confirmadas como intencionales, no bugs** (para no relitigarlas en el futuro): el panel de marca partido de `/login` (franja superior en mobile vs. mitad de pantalla en desktop, con tagline oculta `hidden lg:block`) y los puntos de color vs. chips con texto del calendario mensual — ambas son decisiones ya razonadas y documentadas en entradas previas, distintas del caso de las tablas (que no tiene ninguna solución mobile deliberada, solo overflow por defecto).

**Ideas de "app dinámica" priorizadas** (detalle completo en el chat de la sesión): solo-frontend y sin nueva dependencia — skeletons de carga en "Resumen", animación de conteo ascendente en cifras, entrada escalonada de listas con utilidades ya existentes de `tailwindcss-animate`, countdown de "próximo culto" calculado del lado del cliente sobre datos ya obtenidos, comparación de balance vs. mes anterior (con una segunda llamada al mismo endpoint de finanzas ya existente, sin backend nuevo). La única idea que sí requiere backend es un feed de "actividad reciente" cruzando módulos — se documentó como propuesta completa en `frontend/prompt.md` (se reemplazó por completo el contenido anterior de ese archivo, que era un mensaje de backend→frontend ya resuelto sobre un fix de CSRF).

**No se pudo hacer verificación visual con navegador real** (no hay Playwright/herramienta de captura disponible en este entorno) — mismo límite que las auditorías anteriores del 2026-07-11 y 2026-07-08; la auditoría se hizo por lectura completa del código fuente de todas las rutas y componentes relevantes.

---

## 2026-07-12 (continuación 2) — 4 mejoras de UX: notas, confirmación de borrado, dashboard con datos reales, navbar unificado

Decisiones de diseño definidas por un agente `ux-ui-expert`, implementadas en esta sesión. `npm run lint`, `npm run typecheck` y `npm run build` pasan limpios. Se levantó `npm run dev` con el backend local (`localhost:3001`) corriendo y se confirmó por `curl` que `/`, `/agenda`, `/finanzas`, `/notas`, `/usuarios` y `/superadmin` compilan y responden 200 sin errores en el log del dev server — **no se pudo hacer una verificación visual interactiva real** (hover, animación del drawer, flujo de confirmación) porque no hay Playwright/`chromium-cli` disponible en este entorno; se recomienda una pasada visual manual antes de dar el punto 4 (drawer) por completamente cerrado, en particular el slide-in desde la derecha en mobile y desktop.

**1. Notas largas ya no muestran preview de contenido — muestran fecha de creación** (`src/app/notas/page.tsx`, `NotaLargaRow`): se quitó el párrafo con `nota.descripcion` (podía filtrar contenido sensible en la vista de lista) y se agregó `formatoFechaCreacion` (con año, a diferencia de `formatoFechaLimite`, porque `createdAt` se acumula por años). El contenido completo se sigue viendo al abrir la nota (`NotaDialog`, `Textarea rows={8}`).

**2. Confirmación antes de eliminar nota/recordatorio** (`src/components/notas/nota-dialog.tsx`): se agregó un booleano `confirmandoEliminar` (resuelto en el mismo `useEffect` que resetea el diálogo al abrir). El botón "Eliminar" ya no dispara `handleDelete` directo — abre un panel de confirmación dentro del mismo `DialogContent` ("¿Eliminar este recordatorio/esta nota? Esta acción no se puede deshacer.", con "Cancelar" y "Sí, eliminar"). Patrón simplificado del que ya usa `MovimientoDialog` en finanzas (que tiene un enum `Modo` completo); acá alcanzó con un booleano porque no hay tantos estados intermedios. **Pendiente señalado, no corregido en esta sesión**: `src/components/agenda/evento-dialog.tsx` (~línea 223) tiene el mismo bug de eliminar sin confirmar — fuera de alcance de este pedido puntual, queda para una pasada futura.

**3. Dashboard (`/`): "Accesos rápidos" reemplazado por "Resumen" con datos reales** (`src/app/page.tsx`): se eliminó por completo `ACCESOS_POR_ROL` (una grilla de links estáticos a módulos) y se reemplazó por tarjetas (`ResumenTile`, mismo patrón visual `StatTile` que ya usan `finanzas/page.tsx` y `superadmin/page.tsx`) con datos reales vía `apiFetch`, fetch directo + `useState` + try/catch silencioso (si falla, la tarjeta simplemente no aparece — mismo patrón que `cargarTareas`/`cargarEventosProximos` en el mismo archivo):
   - PASTOR: "Balance de caja (mes actual)" (mismo endpoint y cálculo de rango de mes que `finanzas/page.tsx`) + "Miembros del equipo" (`/usuarios`, `.length`).
   - TESORERO: solo "Balance de caja (mes actual)".
   - SECRETARIA: sin tarjetas — la sección "Resumen" no se renderiza para este rol.
   - SUPER_ADMIN: "Iglesias activas" (con "de N registradas") + "Pastores", desde `/superadmin/dashboard`.
   - El gateo de las tarjetas de PASTOR/TESORERO reutiliza el mismo criterio de acceso que ya rige esos módulos (no es un criterio nuevo).
   - Se exportó `DashboardResponse` desde `src/app/superadmin/page.tsx` (antes era una interfaz local sin `export`) para reutilizar el mismo tipo en el home en vez de redeclararlo.
   - **Decisión de UX que rompe un patrón previo**: el home ya no tiene links de acceso directo a todos los módulos accesibles por rol (agenda, notas, etc.) — solo a los que tienen una tarjeta de datos. La navegación a esos módulos ahora depende del navbar (ver punto 4).

**4. Navbar: menú lateral único para mobile y desktop** (`src/components/layout/navbar.tsx`): se eliminó la `<nav>` horizontal de escritorio; el botón `Menu` (antes solo mobile, `md:hidden`) ahora se muestra en todos los breakpoints y abre un único `Dialog`/drawer para ambos. **Decisión de UX que rompe un patrón previo**: el drawer ahora sale del lado derecho (`inset-y-0 right-0`, con `slide-in-from-right`/`slide-out-to-right` de `tailwindcss-animate`, neutralizando el `zoom-in-95` heredado de `DialogContent` a `zoom-in-100` para que no compita con el slide) en vez de deslizar desde arriba-izquierda como el patrón mobile anterior. Se quitó la entrada "Inicio" de `NAV_LINKS` para los 5 roles (el wordmark "Evangelicapp", ya un `<Link href="/">`, cumple esa función). El `DialogTitle` del drawer dejó de ser `sr-only` y ahora es texto visible chico ("Menú"). "Cerrar sesión" sigue siempre visible en el header, fuera del drawer.

---

## 2026-07-12 (continuación) — Fix: `ci.yml` reubicado a la raíz del repo

Sobre el hallazgo de la entrada anterior: el usuario confirmó que había que corregirlo. `ci.yml` vivía en `frontend/.github/workflows/ci.yml`, una subcarpeta que GitHub Actions no lee — solo escanea `.github/workflows/` en la **raíz** del repositorio. Se movió con `git mv` a `.github/workflows/ci.yml` (raíz), sin tocar el contenido, y se eliminó la carpeta `frontend/.github/` que quedaba vacía tras el move.

Antes de mover, se comparó contra la versión de la rama `features` (que sí lo tenía bien ubicado desde antes): el contenido es **idéntico**, la única diferencia era el fin de línea (CRLF en el checkout de esta rama en Windows vs. LF en el blob de `features`) — no había fixes adicionales que preservar ni conflicto de contenido que decidir.

Con esto, `main` sigue teniendo el mismo problema (no se tocó esa rama) — queda anotado igual que antes como algo a corregir ahí también si el equipo lo decide, pero ya no aplica a `features-local`.

---

## 2026-07-12 — Rama `features-local`: dejada solo para ejecución local

Pedido explícito: esta rama no debe apuntar a producción bajo ninguna circunstancia — las configuraciones de deploy a Vercel viven en otras ramas (`features`/`main`).

**Cambio hecho:**
- **`.env.example`**: se invirtió cuál URL queda activa. Antes `NEXT_PUBLIC_API_URL` apuntaba por defecto a producción (`https://evangelicapp-backend.onrender.com`) con `localhost:3001` comentado; ahora `localhost:3001` es el default activo y la URL de Render queda comentada solo como referencia. Cualquiera que clone esta rama y corra `cp .env.example .env.local` sin editar nada queda apuntando a un backend local, no a producción.

**Revisado y NO modificado (con la razón):**
- **`next.config.ts`**: ya deriva `images.remotePatterns` de `NEXT_PUBLIC_API_URL` con fallback a `http://localhost:3001` — es agnóstico de entorno desde antes, no requería cambios.
- **`.env.local`** (no versionado, ignorado por `.gitignore`): ya tenía `localhost:3001` activo en este entorno de desarrollo — no se toca porque nunca se commitea.
- **`.github/workflows/ci.yml`** (vive en `frontend/.github/workflows/ci.yml`, no en la raíz del repo — mismo lugar que en `main`): se decidió **no tocarlo**. El trigger es `pull_request`/`push` solo sobre la rama `main` (`branches: [main]`), así que no corre por trabajar en `features-local` ni bloquea nada acá. Además, correr `lint`+`typecheck`+`build` no despliega nada ni depende de credenciales de producción (usa un `NEXT_PUBLIC_API_URL` dummy solo para que el build no falle) — es un gate de calidad de código, no de infraestructura, así que no hay ceremonia que quitar. **Hallazgo aparte, no corregido a propósito**: el archivo está en `frontend/.github/workflows/ci.yml`, no en `.github/workflows/ci.yml` en la raíz del repo (que es donde GitHub Actions realmente busca workflows) — esto es igual en `main`, así que probablemente el CI no se está ejecutando ahí tampoco hoy. En la rama `features` sí está en la raíz (`.github/workflows/ci.yml`) y correría normalmente. No se corrigió acá porque (a) es un problema preexistente compartido con `main`, no algo introducido por dejar esta rama "solo local", y (b) tocar la ubicación del workflow es una decisión que afecta el flujo de CI real del proyecto — queda señalado para que el equipo lo decida, no asumido unilateralmente.
- **`vercel.json`**: no existe en ninguna rama del repo (`main`, `features`, `features-local`) — la config de Vercel vive en la plataforma (dashboard de Vercel), no en el repo. No hay nada que remover.
- **`.gitignore` de la raíz** (nuevo, sin commitear, contenido `.claude/`): no se tocó — parece trabajo en progreso del usuario, no relacionado a este pedido.

**Pendiente para quien retome esto:** decidir si se quiere reubicar `ci.yml` a la raíz del repo (para que corra de verdad en `main`) — es una decisión de proceso, no técnica, y excede el pedido puntual de esta sesión (dejar `features-local` sin dependencias de producción).

---

## 2026-07-11 — Correcciones de la auditoría UX/UI (contraste, mobile, accesibilidad)

Un agente `ux-ui-expert` auditó toda la interfaz (sin tocar código) y entregó un informe con 19 hallazgos. Se implementaron todos los de severidad alta y media, y la mayoría de los de baja severidad; el resto quedó anotado abajo como pendiente explícito. `npm run lint`, `npm run typecheck` y `npm run build` pasan limpios después de cada grupo de cambios. **No se pudo verificar visualmente en un navegador real** (no hay backend corriendo en este entorno para loguearse, ni `chromium-cli`/Playwright disponible en esta sesión) — la verificación fue por revisión manual de clases Tailwind contra el DOM esperado y build exitoso. Se recomienda una pasada visual rápida en el próximo entorno con navegador disponible, sobre todo del navbar mobile y el calendario.

**Alta severidad:**
- **Contraste de `--primary` (`src/app/globals.css`)**: el celeste original (`199 84% 62%`) daba ~2.15:1 de contraste como texto/botón — bajo el mínimo WCAG AA (4.5:1) en los usos reales del token (texto blanco sobre `bg-primary`, `text-primary` sobre blanco/`bg-accent`). Se bajó la luminosidad a `34%` (mismo H/S, cambio de un solo valor) tras validar con cálculo de contraste WCAG real (ver script usado, no versionado): a 34% da ~5.4:1 texto-blanco-sobre-primary, ~5.9:1 `text-primary` sobre blanco, ~5.0:1 sobre `bg-accent` — pasa AA en los tres casos. El rango que sugería el informe (48-50%) **no alcanzaba a pasar AA** en la validación real (~2.9:1) — se documenta acá porque es una desviación consciente de la recomendación literal, no un error. `--ring` se actualizó igual (ya replicaba el valor de `--primary`). No se tocaron otros tokens ni archivos — es un cambio de una sola variable, todos los usos de `text-primary`/`bg-primary`/`ring` se corrigen solos.
- **Navbar sin navegación en mobile (`src/components/layout/navbar.tsx`)**: se agregó un botón de menú (ícono `Menu`, visible `<md`) que abre un panel deslizante desde arriba construido sobre los primitivos `Dialog`/`DialogContent` de Radix ya existentes (sin agregar dependencia `Sheet` nueva) — reutiliza el mismo `DialogContent` sobreescribiendo posición/tamaño vía `className` (maneja focus trap, Escape y overlay gratis). Muestra los mismos `NAV_LINKS[usuario.rol]`, el nombre de la iglesia y el `@username` que ya estaban ocultos `<sm`/`<md`.
- **Header de Finanzas desbordado en mobile**: `flex-wrap` en el contenedor de título+botones y en el grupo de botones (`src/app/finanzas/page.tsx`).
- **Selector de mes con ancho fijo**: `w-48` fijo reemplazado por `min-w-0 flex-1` (mobile) + `sm:flex-none sm:w-48` (desktop, mismo ancho que antes) en `src/app/agenda/page.tsx` y `src/app/finanzas/page.tsx`.
- **Calendario mensual en mobile (`src/components/agenda/month-calendar.tsx`)**: `min-h` de celda baja a `64px` en mobile (`96px` desde `sm:`), el número de día ahora tiene su propia área de toque de 28px. Los chips de evento truncados se reemplazan en mobile (`sm:hidden`) por puntos de densidad de color (hasta 4, nuevo `TIPO_EVENTO_DOT_CLASS` en `src/components/agenda/types.ts` — versión saturada del `TIPO_EVENTO_CHIP_CLASS` pastel, que a 6px de diámetro quedaba invisible). Importante: los puntos **siguen siendo interactivos** (`<button>` con `aria-label` del título del evento) para no perder la posibilidad de abrir/editar un evento existente desde el calendario en mobile — el informe sugería solo un indicador visual, pero quitarle el click habría sido una regresión funcional real (sin otra forma de llegar al detalle de un evento existente en mobile), así que se mantuvo la interacción y solo se resolvió el problema real (legibilidad/overflow).
- **Filas de inputs sin colapsar en diálogos angostos**: `flex-col sm:flex-row` en la fila de "agregar predicador" (`src/components/agenda/evento-dialog.tsx`) y en la de "crear categoría" (`src/components/finanzas/movimiento-dialog.tsx`).

**Media severidad:**
- **Filas de tabla clickeables sin teclado**: `role="button" tabIndex={0}` + `onKeyDown` (Enter/Space) en `src/app/finanzas/page.tsx` y `src/app/superadmin/page.tsx`.
- **Botones de solo ícono sin `aria-label`**: "Rechazar tarea" en `src/app/notas/page.tsx`, "Quitar predicador" en `src/components/agenda/evento-dialog.tsx`.
- **Calendario: teclado en celdas y chips**: `onKeyDown` de la celda ahora escucha Enter y Space; los chips de evento (desktop) pasaron de `<span onClick>` a `<button>` con su propio `onKeyDown` (Enter/Space) y `stopPropagation` en ambos handlers, no solo en `onClick`.
- **Padding de página inconsistente**: `p-8` fijo → `p-4 sm:p-8` en los `<main>` principales de agenda, finanzas, notas, usuarios, superadmin y superadmin/iglesias/[id] (los bloques de "sin permisos" de esas mismas páginas se dejaron con `p-8` — son contenido corto centrado, no tienen el problema de overflow que motivaba el cambio).
- **Headers sin `flex-wrap` consistente**: se unificó a `flex flex-wrap items-center justify-between gap-4` en las páginas que no lo tenían (agenda, finanzas, superadmin, superadmin/iglesias/[id], usuarios).
- **Badge de iglesia SUSPENDIDA vs INACTIVA**: antes mismo estilo visual (gris). Se agregó `ESTADO_BADGE_CLASS` en `src/app/superadmin/page.tsx` y `src/app/superadmin/iglesias/[id]/page.tsx` — `SUSPENDIDA` ahora usa tono ámbar, `INACTIVA` sigue gris neutro, `ACTIVA` sigue con el tono `accent`/`primary`.

**Baja severidad implementadas:**
- **Loader en vez de pantalla en blanco durante hidratación**: los `if (!ready || !usuario) return null` de las 7 páginas que usan `useRequireAuth` (`src/app/page.tsx`, `agenda`, `finanzas`, `notas`, `usuarios`, `superadmin`, `superadmin/iglesias/[id]`) ahora renderizan un `<Loader2 className="animate-spin" />` centrado en vez de `null`. **No se tocó `use-require-auth.ts`** — solo el patrón de renderizado en cada página, como pedía la restricción.
- **Campo Descripción del evento**: `Input` → `Textarea rows={3}` en `src/components/agenda/evento-dialog.tsx`.
- **Tooltips en etiquetas truncadas de gráficos de barra**: `title={...}` agregado en `CategoriaBars` (`src/app/finanzas/page.tsx`) y `RegionBars` (`src/app/superadmin/page.tsx`).

**Pendiente / anotado a propósito, no implementado (por riesgo, ambigüedad, o decisión explícita del informe de no forzarlo):**
- **Tablas responsive como cards en mobile** (finanzas/usuarios/superadmin): requiere reestructurar cada tabla a un patrón `hidden md:table` / `md:hidden` con markup duplicado — se dejó fuera por ser un cambio no acotado, tal como permitía el informe.
- **Color ámbar sobrecargado** entre "Egreso" (finanzas) y "En revisión" (notas): es una decisión de producto, no un bug — no se tocó sin confirmación.
- **Touch targets de 40px**: es el default de shadcn/ui, no una regresión — queda como mejora futura.
- **Acceso restringido a Notas** (`usuario.rol !== "PASTOR"`): confirmado que es intencional, no un bug — no requiere cambio.

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
