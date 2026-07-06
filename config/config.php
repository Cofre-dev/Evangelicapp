<?php
/* ============================================
   CONFIGURACIÓN GENERAL — edita estos valores
   ============================================ */

// Base de datos MySQL
define('DB_HOST', 'localhost');
define('DB_NAME', 'iglesias_app');
define('DB_USER', 'root');
define('DB_PASS', '');

// Clave secreta para firmar los JWT.
// ¡Cámbiala por una cadena larga y aleatoria antes de producción!
define('JWT_SECRET', 'hola');

// Duración de la sesión (segundos). 8 horas por defecto.
define('JWT_DURACION', 60 * 60 * 8);

// URL base del proyecto, SIN slash final (se usa en los correos)
define('BASE_URL', 'http://localhost/iglesia-app');

// Remitente de los correos
define('MAIL_FROM', 'no-responder@miiglesia.cl');
