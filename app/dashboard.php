<?php
/* Página principal del usuario de iglesia (pastor, tesorero, secretaria, otro) */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

$u = requiere_rol(['pastor', 'tesorero', 'secretaria', 'otro']);

// Datos frescos del usuario y su iglesia (el flag de contraseña se lee de la BD, no del token)
$st = db()->prepare('SELECT * FROM usuarios WHERE id = ?');
$st->execute([$u['uid']]);
$usuarioBD = $st->fetch();

$st = db()->prepare('SELECT * FROM iglesias WHERE id = ?');
$st->execute([$u['iglesia_id']]);
$iglesia = $st->fetch();

$primerIngreso = (int)$usuarioBD['debe_cambiar_password'] === 1;

// Próximos eventos
$st = db()->prepare('SELECT * FROM eventos WHERE iglesia_id = ? AND fecha >= CURDATE() ORDER BY fecha, hora_inicio LIMIT 4');
$st->execute([$u['iglesia_id']]);
$proximos = $st->fetchAll();

// Balance del mes en curso
$st = db()->prepare(
    "SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto END),0) AS ingresos,
            COALESCE(SUM(CASE WHEN tipo='egreso'  THEN monto END),0) AS egresos
       FROM movimientos
      WHERE iglesia_id = ? AND DATE_FORMAT(fecha,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m')"
);
$st->execute([$u['iglesia_id']]);
$fin = $st->fetch();

// Notas por vencer
$st = db()->prepare('SELECT * FROM notas WHERE iglesia_id = ? AND usuario_id = ? AND completada = 0 ORDER BY fecha_limite LIMIT 4');
$st->execute([$u['iglesia_id'], $u['uid']]);
$notas = $st->fetchAll();

$titulo = 'Inicio';
$activo = 'inicio';
require __DIR__ . '/../partials/header_app.php';
?>
<section class="hero hero-iglesia">
  <?php if ($iglesia['logo']): ?><img class="hero-logo" src="../<?= e($iglesia['logo']) ?>" alt="Logo de la iglesia"><?php endif; ?>
  <div>
    <p class="eyebrow">La paz sea contigo, <?= e($usuarioBD['nombre']) ?></p>
    <h1><?= e($iglesia['nombre']) ?></h1>
    <p class="hero-sub"><?= e($iglesia['comuna']) ?> · Región <?= e($iglesia['region']) ?></p>
  </div>
</section>

<?php if (isset($_GET['bienvenida'])): ?>
  <div class="alerta alerta-ok">¡Bienvenido! Tus datos fueron guardados y tu contraseña actualizada.</div>
<?php endif; ?>

<section class="tarjetas-grid tarjetas-3">
  <article class="tarjeta">
    <h2 class="tarjeta-titulo">Próximos eventos</h2>
    <?php if (!$proximos): ?><p class="vacio">Nada agendado aún. <a href="agenda.php">Planifica el mes</a>.</p>
    <?php else: foreach ($proximos as $ev): ?>
      <div class="linea-evento">
        <span class="chip chip-<?= e(mb_strtolower(strtr($ev['tipo'], ['ó'=>'o']))) ?>"><?= e($ev['tipo']) ?></span>
        <span><?= date('d-m', strtotime($ev['fecha'])) ?><?= $ev['hora_inicio'] ? ' · ' . substr($ev['hora_inicio'], 0, 5) : '' ?></span>
      </div>
    <?php endforeach; endif; ?>
  </article>

  <article class="tarjeta">
    <h2 class="tarjeta-titulo">Finanzas del mes</h2>
    <div class="linea-fin"><span>Ingresos</span><strong class="monto-ingreso"><?= clp($fin['ingresos']) ?></strong></div>
    <div class="linea-fin"><span>Egresos</span><strong class="monto-egreso"><?= clp($fin['egresos']) ?></strong></div>
    <div class="linea-fin linea-fin-total"><span>Balance</span><strong><?= clp($fin['ingresos'] - $fin['egresos']) ?></strong></div>
  </article>

  <article class="tarjeta">
    <h2 class="tarjeta-titulo">Recordatorios</h2>
    <?php if (!$notas): ?><p class="vacio">Sin pendientes. <a href="notas.php">Crea una nota</a>.</p>
    <?php else: foreach ($notas as $n): ?>
      <div class="linea-evento">
        <span><?= e($n['titulo']) ?></span>
        <span class="pill <?= $n['fecha_limite'] < date('Y-m-d') ? 'pill-atrasada' : 'pill-pendiente' ?>">
          <?= date('d-m', strtotime($n['fecha_limite'])) ?>
        </span>
      </div>
    <?php endforeach; endif; ?>
  </article>
</section>

<?php if ($primerIngreso): ?>
<!-- Modal OBLIGATORIO de primer ingreso: no se puede cerrar -->
<div class="modal-fondo" id="modalPrimerIngreso">
  <div class="modal">
    <p class="eyebrow">Primer ingreso</p>
    <h2>Bienvenido a la casa</h2>
    <p class="modal-sub">Antes de comenzar, completa tus datos y crea una contraseña nueva y personal.</p>
    <form method="post" action="../api/primer_ingreso.php" class="formulario">
      <label>Teléfono de contacto
        <input type="tel" name="telefono" placeholder="+56 9 1234 5678">
      </label>
      <?php if ($u['rol'] === 'pastor'): ?>
      <label>¿Cuántas personas visitan tu iglesia en promedio?
        <input type="number" name="visitantes" min="1" required placeholder="80">
      </label>
      <?php endif; ?>
      <label>Nueva contraseña (mín. 8 caracteres)
        <input type="password" name="password" minlength="8" required>
      </label>
      <label>Repite la nueva contraseña
        <input type="password" name="password2" minlength="8" required>
      </label>
      <button type="submit" class="boton boton-primario boton-ancho">Guardar y comenzar</button>
    </form>
  </div>
</div>
<?php endif; ?>
<?php require __DIR__ . '/../partials/footer.php'; ?>
