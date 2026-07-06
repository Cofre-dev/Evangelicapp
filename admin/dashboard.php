<?php
/* Vista del SUPERADMINISTRADOR: todas las iglesias y pastores registrados */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

$u = requiere_rol(['superadmin']);

$totIglesias = db()->query('SELECT COUNT(*) FROM iglesias')->fetchColumn();
$totPastores = db()->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'pastor'")->fetchColumn();
$totUsuarios = db()->query("SELECT COUNT(*) FROM usuarios WHERE rol <> 'superadmin'")->fetchColumn();
$totComunas  = db()->query('SELECT COUNT(DISTINCT comuna) FROM iglesias')->fetchColumn();

$iglesias = db()->query(
    "SELECT i.*,
            GROUP_CONCAT(CASE WHEN us.rol = 'pastor' THEN us.nombre END SEPARATOR ', ') AS pastores,
            COUNT(us.id) AS total_usuarios
       FROM iglesias i
       LEFT JOIN usuarios us ON us.iglesia_id = i.id
      GROUP BY i.id
      ORDER BY i.created_at DESC"
)->fetchAll();

$titulo = 'Panel general';
$activo = 'panel';
require __DIR__ . '/../partials/header_app.php';
?>
<section class="hero hero-admin">
  <p class="eyebrow">Visión general del sistema</p>
  <h1>Iglesias registradas</h1>
</section>

<section class="tarjetas-grid">
  <div class="tarjeta tarjeta-dato"><span class="dato-numero"><?= $totIglesias ?></span><span class="dato-nombre">Iglesias</span></div>
  <div class="tarjeta tarjeta-dato"><span class="dato-numero"><?= $totPastores ?></span><span class="dato-nombre">Pastores</span></div>
  <div class="tarjeta tarjeta-dato"><span class="dato-numero"><?= $totUsuarios ?></span><span class="dato-nombre">Usuarios totales</span></div>
  <div class="tarjeta tarjeta-dato"><span class="dato-numero"><?= $totComunas ?></span><span class="dato-nombre">Comunas alcanzadas</span></div>
</section>

<section class="tarjeta">
  <?php if (!$iglesias): ?>
    <p class="vacio">Aún no hay iglesias registradas. <a href="crear_pastor.php">Crea la primera</a>.</p>
  <?php else: ?>
  <div class="tabla-scroll">
    <table class="tabla">
      <thead>
        <tr>
          <th>Iglesia</th><th>Pastor(es)</th><th>Comuna</th><th>Región</th>
          <th>Dirección</th><th>Visitantes prom.</th><th>Usuarios</th><th>Registrada</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($iglesias as $ig): ?>
        <tr>
          <td class="celda-iglesia">
            <?php if ($ig['logo']): ?><img src="../<?= e($ig['logo']) ?>" alt="" class="mini-logo"><?php endif; ?>
            <?= e($ig['nombre']) ?>
          </td>
          <td><?= e($ig['pastores'] ?: '—') ?></td>
          <td><?= e($ig['comuna']) ?></td>
          <td><?= e($ig['region']) ?></td>
          <td><?= e($ig['direccion'] ?: '—') ?></td>
          <td><?= $ig['visitantes_promedio'] !== null ? e($ig['visitantes_promedio']) : '<span class="pill pill-pendiente">Sin datos</span>' ?></td>
          <td><?= $ig['total_usuarios'] ?></td>
          <td><?= date('d-m-Y', strtotime($ig['created_at'])) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php endif; ?>
</section>
<?php require __DIR__ . '/../partials/footer.php'; ?>
