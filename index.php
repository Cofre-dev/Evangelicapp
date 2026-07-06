<?php
/* Página de inicio de sesión */
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/helpers.php';

// Si ya hay sesión, redirigir según el rol
$sesion = usuario_actual();
if ($sesion) {
    header('Location: ' . ($sesion['rol'] === 'superadmin' ? 'admin/dashboard.php' : 'app/dashboard.php'));
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $pass  = $_POST['password'] ?? '';

    $st = db()->prepare('SELECT * FROM usuarios WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();

    if ($u && password_verify($pass, $u['password_hash'])) {
        emitir_token($u);
        header('Location: ' . ($u['rol'] === 'superadmin' ? 'admin/dashboard.php' : 'app/dashboard.php'));
        exit;
    }
    $error = 'Correo o contraseña incorrectos.';
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Iniciar sesión · Gestión de Iglesias</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body class="pagina-login">
  <main class="login-caja">
    <div class="login-halo" aria-hidden="true"></div>
    <p class="eyebrow">Gestión de iglesias</p>
    <h1 class="login-titulo">La paz sea contigo</h1>
    <p class="login-verso">«Todo lo que hagáis, hacedlo de corazón» — Col. 3:23</p>

    <?php if ($error): ?><div class="alerta alerta-error"><?= e($error) ?></div><?php endif; ?>

    <form method="post" class="formulario">
      <label>Correo electrónico
        <input type="email" name="email" required autofocus placeholder="pastor@miiglesia.cl">
      </label>
      <label>Contraseña
        <input type="password" name="password" required placeholder="••••••••">
      </label>
      <button type="submit" class="boton boton-primario boton-ancho">Entrar</button>
    </form>
  </main>
</body>
</html>
