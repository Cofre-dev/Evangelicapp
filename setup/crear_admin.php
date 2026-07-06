<?php
/* ============================================================
   EJECUTAR UNA SOLA VEZ y luego BORRAR este archivo.
   Crea el superadministrador inicial del sistema.
   Uso: abre http://localhost/iglesia-app/setup/crear_admin.php
   ============================================================ */
require_once __DIR__ . '/../config/database.php';

$email = 'admin@sistema.cl';
$pass  = 'Admin.2026';   // cámbiala apenas entres

$existe = db()->prepare('SELECT id FROM usuarios WHERE email = ?');
$existe->execute([$email]);
if ($existe->fetch()) {
    exit('El superadmin ya existe. Borra este archivo.');
}

db()->prepare(
    'INSERT INTO usuarios (iglesia_id, nombre, email, password_hash, rol, debe_cambiar_password)
     VALUES (NULL, ?, ?, ?, "superadmin", 0)'
)->execute(['Super Administrador', $email, password_hash($pass, PASSWORD_DEFAULT)]);

echo "Superadmin creado.<br>Email: $email<br>Contraseña: $pass<br><b>Ahora BORRA la carpeta /setup.</b>";
