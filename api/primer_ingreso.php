<?php
/* Procesa el modal obligatorio del primer ingreso:
   guarda teléfono, visitantes promedio (si es pastor) y la NUEVA contraseña */
require_once __DIR__ . '/../includes/auth.php';

$u = requiere_rol(['pastor', 'tesorero', 'secretaria', 'otro']);

$pass  = $_POST['password']  ?? '';
$pass2 = $_POST['password2'] ?? '';
$tel   = trim($_POST['telefono'] ?? '');
$visit = (int)($_POST['visitantes'] ?? 0);

if (strlen($pass) < 8 || $pass !== $pass2) {
    exit('Las contraseñas no coinciden o son muy cortas. <a href="../app/dashboard.php">Volver</a>');
}

db()->prepare('UPDATE usuarios SET password_hash = ?, telefono = ?, debe_cambiar_password = 0 WHERE id = ?')
    ->execute([password_hash($pass, PASSWORD_DEFAULT), $tel ?: null, $u['uid']]);

// El promedio de visitantes queda registrado en la iglesia (dato que ve el superadmin)
if ($u['rol'] === 'pastor' && $visit > 0) {
    db()->prepare('UPDATE iglesias SET visitantes_promedio = ? WHERE id = ?')
        ->execute([$visit, $u['iglesia_id']]);
}

// Reemitir el JWT sin el flag de cambio de contraseña
$st = db()->prepare('SELECT * FROM usuarios WHERE id = ?');
$st->execute([$u['uid']]);
emitir_token($st->fetch());

header('Location: ../app/dashboard.php?bienvenida=1');
