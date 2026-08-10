# Brief para frontend: certificados PDF ahora se cachean (Fase 3 de docs/supabase.md)

## Resumen para quien tenga poco tiempo

**No hay ninguna acción requerida en el frontend.** Contrato de API idéntico: mismo endpoint (`GET /ceremonias/{bautizos|matrimonios|defunciones|presentaciones}/:id/certificado`), misma respuesta (PDF binario, mismos headers `Content-Type`/`Content-Disposition`). El único cambio visible es que la 2da descarga en adelante del mismo certificado es más rápida. El resto de este documento es contexto por si les sirve, no trabajo pendiente.

## Qué cambió

Antes, cada descarga de un certificado (bautizo, matrimonio, defunción, presentación) regeneraba el PDF desde cero con `pdfkit`. Ahora el backend cachea el PDF generado en un bucket privado de Supabase Storage (`certificados-ceremonias`) la primera vez, y lo sirve directo de ahí en descargas siguientes — mientras el registro y el logo de la iglesia no cambien. Si se edita el certificado o cambia el logo, se regenera automáticamente en la siguiente descarga.

El bucket es **privado** (a diferencia de los buckets de logos/fotos de fases anteriores): el PDF sigue pasando siempre por el mismo endpoint autenticado de antes, nunca hay una URL pública directa al archivo cacheado.

## Un detalle de contenido del PDF, por si les importa (no es una llamada a la acción)

El PDF trae una caption "fecha de emisión" en la esquina superior derecha. Antes siempre mostraba la fecha real de cada descarga (una reimpresión meses después mostraba la fecha de la reimpresión). Con el caché, esa fecha queda fija en el momento en que se generó esa versión del PDF — no se actualiza en descargas subsiguientes que pegan en caché. Esto fue una decisión consciente confirmada con el fundador (no un bug), documentada en `FEATURES.md`.

Esto **no afecta la fecha real de la ceremonia** (bautizo/matrimonio/etc.), que sigue siempre correcta en el cuerpo del certificado — es la única fecha con relevancia legal/administrativa del documento. Lo menciono solo por si en algún lugar de la UI (tooltip, texto de ayuda, changelog de la app) describen o prometen ese comportamiento de "la fecha de emisión siempre es la de hoy"; si no es el caso, pueden ignorar esta sección.

## Lo que NO cambió

- Endpoints, métodos, nombres de parámetros.
- Formato de respuesta (PDF, mismo `Content-Disposition: attachment; filename="certificado_..._{folio}.pdf"`).
- Guards/roles/permisos de acceso al certificado.
- Nada que requiera tocar `next.config.js`, `api.ts`, ni ningún store — esta fase es 100% interna al backend.