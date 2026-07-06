<?php
/* Envía por correo los recordatorios de notas que vencen HOY (o ya vencieron)
   y aún no han sido notificadas. Programar una vez al día, por ejemplo:

   0 8 * * * php /ruta/a/iglesia-app/cron/notificar_notas.php

   En hosting compartido (cPanel) se agrega igual desde "Cron Jobs". */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

$st = db()->query(
    "SELECT n.*, u.email, u.nombre AS usuario
       FROM notas n
       JOIN usuarios u ON u.id = n.usuario_id
      WHERE n.completada = 0 AND n.notificado = 0 AND n.fecha_limite <= CURDATE()"
);

$enviadas = 0;
foreach ($st as $n) {
    $html = "
      <div style='font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#F6FAFD;border-radius:12px'>
        <h2 style='color:#2E4459'>Recordatorio pendiente</h2>
        <p>Hola " . e($n['usuario']) . ", tienes una nota que vence hoy:</p>
        <p style='background:#fff;padding:16px;border-radius:8px;border-left:4px solid #8FC1E3'>
          <b>" . e($n['titulo']) . "</b><br>" . e($n['contenido'] ?? '') . "</p>
        <p style='color:#6B8299;font-size:13px'>Entra a la aplicación para marcarla como cumplida.</p>
      </div>";

    if (enviar_correo($n['email'], 'Recordatorio: ' . $n['titulo'], $html)) {
        db()->prepare('UPDATE notas SET notificado = 1 WHERE id = ?')->execute([$n['id']]);
        $enviadas++;
    }
}
echo "Notificaciones enviadas: $enviadas\n";
