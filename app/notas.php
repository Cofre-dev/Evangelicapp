<?php
/* Módulo 3 — Notas: recordatorios con fecha límite y aviso por correo */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

$u = requiere_rol(['pastor', 'tesorero', 'secretaria', 'otro']);
$st = db()->prepare('SELECT * FROM iglesias WHERE id = ?');
$st->execute([$u['iglesia_id']]);
$iglesia = $st->fetch();

// Acciones (crear / completar / eliminar) — PHP puro con POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = $_POST['accion'] ?? '';
    if ($accion === 'crear') {
        $tituloNota = trim($_POST['titulo'] ?? '');
        $contenido  = trim($_POST['contenido'] ?? '');
        $limite     = $_POST['fecha_limite'] ?? '';
        if ($tituloNota && $limite) {
            db()->prepare('INSERT INTO notas (iglesia_id, usuario_id, titulo, contenido, fecha_limite) VALUES (?,?,?,?,?)')
                ->execute([$u['iglesia_id'], $u['uid'], $tituloNota, $contenido, $limite]);
        }
    } elseif ($accion === 'completar') {
        db()->prepare('UPDATE notas SET completada = 1 WHERE id = ? AND iglesia_id = ? AND usuario_id = ?')
            ->execute([(int)$_POST['id'], $u['iglesia_id'], $u['uid']]);
    } elseif ($accion === 'eliminar') {
        db()->prepare('DELETE FROM notas WHERE id = ? AND iglesia_id = ? AND usuario_id = ?')
            ->execute([(int)$_POST['id'], $u['iglesia_id'], $u['uid']]);
    }
    header('Location: notas.php');
    exit;
}

$st = db()->prepare('SELECT * FROM notas WHERE iglesia_id = ? AND usuario_id = ? ORDER BY completada, fecha_limite');
$st->execute([$u['iglesia_id'], $u['uid']]);
$notas = $st->fetchAll();

$titulo = 'Notas';
$activo = 'notas';
require __DIR__ . '/../partials/header_app.php';
?>
<section class="hero">
  <p class="eyebrow">Módulo de notas</p>
  <h1>Recordatorios</h1>
  <p class="hero-sub">Recibirás un correo el día del vencimiento de cada nota pendiente.</p>
</section>

<div class="dos-columnas">
  <section class="tarjeta">
    <h2 class="tarjeta-titulo">Nueva nota</h2>
    <form method="post" class="formulario">
      <input type="hidden" name="accion" value="crear">
      <label>Título
        <input type="text" name="titulo" required maxlength="150" placeholder="Llamar al hermano encargado del sonido">
      </label>
      <label>Detalle (opcional)
        <textarea name="contenido" rows="3" placeholder="Confirmar equipos para el culto del domingo…"></textarea>
      </label>
      <label>Fecha límite
        <input type="date" name="fecha_limite" required min="<?= date('Y-m-d') ?>">
      </label>
      <button type="submit" class="boton boton-primario boton-ancho">Guardar nota</button>
    </form>
  </section>

  <section class="tarjeta">
    <h2 class="tarjeta-titulo">Mis notas</h2>
    <?php if (!$notas): ?><p class="vacio">Todavía no tienes notas.</p><?php endif; ?>
    <?php foreach ($notas as $n): ?>
      <article class="nota <?= $n['completada'] ? 'nota-completada' : '' ?>">
        <div class="nota-texto">
          <strong><?= e($n['titulo']) ?></strong>
          <?php if ($n['contenido']): ?><p><?= e($n['contenido']) ?></p><?php endif; ?>
          <span class="pill <?= !$n['completada'] && $n['fecha_limite'] < date('Y-m-d') ? 'pill-atrasada' : 'pill-pendiente' ?>">
            Vence: <?= date('d-m-Y', strtotime($n['fecha_limite'])) ?>
          </span>
        </div>
        <div class="nota-acciones">
          <?php if (!$n['completada']): ?>
          <form method="post"><input type="hidden" name="accion" value="completar"><input type="hidden" name="id" value="<?= $n['id'] ?>">
            <button class="boton boton-suave" title="Marcar como cumplida">✓</button></form>
          <?php endif; ?>
          <form method="post" onsubmit="return confirm('¿Eliminar esta nota?')">
            <input type="hidden" name="accion" value="eliminar"><input type="hidden" name="id" value="<?= $n['id'] ?>">
            <button class="boton boton-suave" title="Eliminar">✕</button></form>
        </div>
      </article>
    <?php endforeach; ?>
  </section>
</div>
<?php require __DIR__ . '/../partials/footer.php'; ?>
