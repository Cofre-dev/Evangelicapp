# Convenciones de Git y GitHub

Cómo se hacen los commits en este repo de ahora en adelante. Nace de dos problemas reales
encontrados en el historial (no son hipotéticos, son commits que ya existen acá):

1. **Commits grandes con mensajes sin información**: `add new features` aparece 3 veces
   (idéntico, en commits distintos), además de `Add new module like an 'IAM'`, `-_-`, `:)`.
   Cada uno agrupa cambios sin relación entre sí. Si algo se rompe, no hay forma de saber en
   cuál commit pasó ni de revertir solo la parte problemática.
2. **Trabajo grande sin commitear acumulado en una sola sesión**: si la máquina se cuelga
   (ver incidente de memoria de esta semana) antes de commitear, se pierde todo de un golpe.
   Commits frecuentes y chicos son la red de seguridad real contra eso, no un capricho de estilo.

## Regla de oro: un commit, un motivo

Un commit debe responder a una sola pregunta de "¿por qué hice este cambio?". Si la respuesta
tiene un "y además...", son dos commits.

Ejemplos de este mismo repo que **no** deberían haberse mezclado en un commit:
- Config de tooling (`.claude/`, `.github/workflows/`, `skills-lock.json`) junto con código de
  un feature de negocio — son motivos distintos (herramientas de desarrollo vs. producto).
- Un rename de roles junto con un módulo nuevo sin relación — cada uno se revierte o revisa
  distinto.

No hace falta partir un feature grande en 10 commits artificiales si es una sola unidad de
trabajo coherente (ver la entrada de Planes/Facturación en `frontend/FEATURES.md`, que sí fue
un commit único justificado). La pregunta no es "¿cuántos archivos toca?" sino "¿cuántos motivos
distintos hay acá?".

## Antes de cada commit

1. `git status` — mirar qué hay staged y sin stagear. No usar `git add -A` ni `git add .` a
   ciegas; agregar archivos por nombre o por carpeta para no arrastrar algo que no corresponde.
2. Si el cambio toca `frontend/`, correr dentro de esa carpeta (no hay suite de tests todavía,
   ver `CLAUDE.md`):
   ```bash
   npm run lint
   npm run typecheck
   npm run build   # si el cambio no es trivial
   ```
   Un commit no debería dejar el árbol roto — ni para el siguiente commit propio ni para quien
   haga `git bisect` después.
3. Si el cambio es una feature o fix no obvio, agregar la entrada correspondiente en
   `frontend/FEATURES.md` **en el mismo commit** que el código (no en uno aparte) — así el
   commit y la explicación de "por qué" viajan juntos en la misma unidad de historia.

## Qué nunca se commitea

| Archivo/patrón | Por qué |
|---|---|
| `.claude/settings.local.json` | Permisos y config local de una sesión/máquina puntual (paths absolutos tipo `C:\Users\<usuario>\...`, comandos ad-hoc de debug). No sirve para otro dev ni para otra máquina. |
| `.env`, `.env*.local` | Secretos/config de entorno (ya cubierto por `frontend/.gitignore`). |
| `.next/`, `node_modules/`, `*.tsbuildinfo` | Artefactos generados (ya cubierto por `frontend/.gitignore`). |
| Cualquier archivo con paths absolutos de una máquina puntual | Si aparece `c:/Users/<nombre>/...` o similar en un archivo de config que se va a commitear, revisar antes — probablemente debería ser relativo o no commitearse. |

El `.gitignore` de la raíz existe pero está vacío — falta agregarle al menos
`.claude/settings.local.json`. Hasta que se agregue, revisar `git status` a mano antes de cada
`git add` para no engancharlo por error.

## Mensaje de commit

Primera línea: modo imperativo, en español (consistente con el resto del historial), qué cambió
— no cómo se llama el archivo que se tocó, sino qué efecto tiene el cambio. Sin punto final.

**Bien** (ejemplos reales de este repo):
```
Migrar autenticación de JWT en localStorage a cookies httpOnly
Agregar widget de próximos eventos al home
Documentar el widget de próximos eventos en FEATURES.md
```

**Mal** (también reales, evitar este patrón):
```
add new features
Add new module like an 'IAM'
-_-
```

Si el cambio no es autoexplicativo con el diff (ej. una decisión de negocio, un workaround, un
contrato de backend que no está en el código), agregar un cuerpo después de una línea en blanco
explicando el **por qué**, no el qué — el diff ya muestra el qué:

```bash
git commit -m "Agregar planes comerciales (Basico/Medio/Pro) y modulo de facturacion" -m "
Backend ya implementa planes, fecha de facturacion y bloqueo por mora
(contrato en frontend/prompt.md). Ver frontend/FEATURES.md para el detalle
completo."
```

## Cuándo commitear

No esperar a que termine toda una sesión de trabajo para hacer un solo commit gigante.
Commitear en cada punto donde el árbol queda en un estado coherente y funcionando — eso puede
ser varias veces por sesión. Si una sesión larga termina sin commitear nada, es una señal de que
se debería haber cortado en pedazos más chicos en el camino.

## Flujo de referencia (comando por comando)

Ejemplo de cómo separar un cambio que mezcla tooling y feature, partiendo de todo staged de una:

```bash
# Ver qué hay antes de tocar nada
git status

# Sacar todo del índice si se stageó todo junto por error (no borra nada, pasa a unstaged)
git reset

# Commit de tooling/config, sin relación con el feature de negocio
git add .claude/agents/ .claude/launch.json .claude/settings.json .github/ skills-lock.json
git commit -m "Agregar configuracion de Claude Code, agentes y CI"

# Commit del feature — código + su entrada en FEATURES.md, todo junto
git add frontend/
git commit -m "Agregar planes comerciales (Basico/Medio/Pro) y modulo de facturacion"

# Confirmar que quedó como se esperaba antes de hacer push
git log --oneline -5
git status
```

## Ramas

Este repo trabaja sobre una rama de desarrollo (`features`) que después se integra a `main`.
Evitar commitear directo contra `main`; los commits de trabajo diario van en `features` (o una
rama dedicada si el cambio es grande y riesgoso, ej. algo que toca `src/lib/api.ts` o
`src/stores/auth-store.ts`) y se integran a `main` de forma explícita, no accidental.
