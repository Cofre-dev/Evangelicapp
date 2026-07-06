<?php
/* Página pública: el predicador confirma o rechaza la invitación desde su correo */
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/config/database.php';

$token     = $_GET['t'] ?? '';
$respuesta = $_GET['r'] ?? '';
$mensaje   = 'Enlace inválido o vencido.';
$exito     = false;

if ($token && in_array($respuesta, ['si', 'no'], true)) {
    $st = db()->prepare(
        'SELECT ep.id, ep.estado, ev.tipo, ev.fecha, ev.hora_inicio, ig.nombre AS iglesia
           FROM evento_predicadores ep
           JOIN eventos ev  ON ev.id = ep.evento_id
           JOIN iglesias ig ON ig.id = ev.iglesia_id
          WHERE ep.token = ?'
    );
    $st->execute([$token]);
    $inv = $st->fetch();

    if ($inv) {
        $nuevo = $respuesta === 'si' ? 'confirmado' : 'rechazado';
        db()->prepare('UPDATE evento_predicadores SET estado = ? WHERE id = ?')
            ->execute([$nuevo, $inv['id']]);
        $exito   = true;
        $fecha   = date('d-m-Y', strtotime($inv['fecha']));
        $mensaje = $respuesta === 'si'
            ? "¡Gracias! Confirmaste tu participación en el {$inv['tipo']} de {$inv['iglesia']} el $fecha."
            : "Registramos que no podrás asistir al {$inv['tipo']} de {$inv['iglesia']} el $fecha. El pastor será informado.";
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Confirmación · Gestión de Iglesias</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body class="pagina-login">
  <main class="login-caja">
    <div class="login-halo" aria-hidden="true"></div>
    <h1 class="login-titulo"><?= $exito ? 'Respuesta registrada' : 'Ups' ?></h1>
    <p style="text-align:center; color:var(--tinta-suave); line-height:1.6"><?= e($mensaje) ?></p>
  </main>
</body>
</html>
