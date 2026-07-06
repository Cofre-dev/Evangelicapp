# Gestión de Iglesias Evangélicas — PHP puro + MySQL

App multi-iglesia (multi-tenant): cada iglesia solo ve sus propios datos.
Autenticación con **JWT firmado (HS256)** guardado en cookie httpOnly.

## Requisitos
- PHP 8.0+ (XAMPP, Laragon o hosting con cPanel)
- MySQL / MariaDB con phpMyAdmin

## Instalación (5 pasos)

1. **Copia la carpeta** `iglesia-app/` dentro de tu servidor web
   (en XAMPP: `C:\xampp\htdocs\iglesia-app`).

2. **Crea la base de datos**: abre phpMyAdmin → pestaña SQL → pega el
   contenido de `schema.sql` → Ejecutar. Se crea la BD `iglesias_app`
   con todas sus tablas.

3. **Configura** `config/config.php`: usuario/clave de MySQL, la
   `JWT_SECRET` (cámbiala por algo largo y aleatorio) y la `BASE_URL`.

4. **Crea el superadmin**: visita una vez
   `http://localhost/iglesia-app/setup/crear_admin.php`
   y luego **borra la carpeta `/setup`**.
   Acceso inicial: `admin@sistema.cl` / `Admin.2026`

5. **Permisos**: la carpeta `uploads/` debe ser escribible por el
   servidor (en Linux: `chmod -R 775 uploads`).

## Flujo del sistema

1. El **superadmin** entra y en "Crear iglesia" registra la iglesia
   (nombre, logo, comuna, región) junto a su **pastor** con contraseña
   temporal.
2. El **pastor** inicia sesión → se abre un **modal obligatorio**:
   completa teléfono, visitantes promedio y **cambia su contraseña**.
3. El pastor ve el logo y nombre de su iglesia en su página principal
   y accede a los 3 módulos: **Agenda**, **Finanzas** y **Notas**.
4. Desde "Mi equipo" el pastor crea usuarios (tesorero, secretaria…)
   que quedan amarrados **solo a su iglesia**.

## Roles y accesos

| Rol        | Agenda | Finanzas | Notas | Crear usuarios |
|------------|:------:|:--------:|:-----:|:--------------:|
| superadmin | —      | —        | —     | pastores       |
| pastor     | ✓      | ✓        | ✓     | su iglesia     |
| tesorero   | ✓      | ✓        | ✓     | —              |
| secretaria | ✓      | —        | ✓     | —              |
| otro       | ✓      | —        | ✓     | —              |

## Correos (invitaciones y recordatorios)

Los correos usan `mail()` de PHP. En XAMPP local normalmente NO salen
correos: prueba esa parte en un hosting real o configura sendmail/SMTP.
Para producción, lo recomendado es reemplazar `enviar_correo()` en
`includes/helpers.php` por PHPMailer + un SMTP (Brevo, Resend, Gmail).

## Recordatorios de notas (cron)

Programa una vez al día:

```
0 8 * * * php /ruta/a/iglesia-app/cron/notificar_notas.php
```

En cPanel: sección "Cron Jobs". En local puedes ejecutarlo a mano:
`php cron/notificar_notas.php`

## Seguridad incluida

- Contraseñas con `password_hash()` (bcrypt)
- JWT firmado, en cookie httpOnly (JS no puede robarlo)
- Consultas 100% preparadas (PDO) contra inyección SQL
- `e()` escapa todo lo que se imprime (contra XSS)
- Todas las consultas filtran por `iglesia_id` del token:
  ninguna iglesia puede ver datos de otra
- Subida de logos validada por tipo real de imagen y tamaño

## Pendientes sugeridos para producción

- HTTPS y activar `'secure' => true` en la cookie (includes/auth.php)
- Cambiar `mail()` por PHPMailer/SMTP
- Respaldos automáticos diarios de la BD
- No exponer phpMyAdmin públicamente
