<?php
/* Solo el PASTOR: crea usuarios (tesorero, secretaria…) DENTRO de su propia iglesia */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

$u = requiere_rol(['pastor']);
$st = db()->prepare('SELECT * FROM iglesias WHERE id = ?');
$st->execute([$u['iglesia_id']]);
$iglesia = $st->fetch();

$ok = ''; $error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombre = trim($_POST['nombre'] ?? '');
    $email  = trim($_POST['email'] ?? '');
    $rol    = $_POST['rol'] ?? '';
    $pass   = $_POST['password'] ?? '';

    if (!$nombre || !$email || !in_array($rol, ['tesorero', 'secretaria', 'otro'], true) || strlen($pass) < 8) {
        $error = 'Revisa los campos: la contraseña temporal necesita al menos 8 caracteres.';
    } else {
        $st = db()->prepare('SELECT id FROM usuarios WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) {
            $error = 'Ese correo ya está registrado en el sistema.';
        } else {
            // El nuevo usuario queda amarrado a LA IGLESIA DEL PASTOR, nunca a otra
            db()->prepare(
                'INSERT INTO usuarios (iglesia_id, nombre, email, password_hash, rol, debe_cambiar_password)
                 VALUES (?,?,?,?,?,1)'
            )->execute([$u['iglesia_id'], $nombre, $email, password_hash($pass, PASSWORD_DEFAULT), $rol]);
            $ok = "Usuario creado. Entrégale su acceso: $email / la contraseña temporal.";
        }
    }
}

$st = db()->prepare("SELECT * FROM usuarios WHERE iglesia_id = ? ORDER BY FIELD(rol,'pastor','tesorero','secretaria','otro'), nombre");
$st->execute([$u['iglesia_id']]);
$equipo = $st->fetchAll();

$titulo = 'Mi equipo';
$activo = 'usuarios';
require __DIR__ . '/../partials/header_app.php';
?>
<section class="hero">
  <p class="eyebrow">Administración de tu iglesia</p>
  <h1>Mi equipo de trabajo</h1>
  <p class="hero-sub">Los usuarios que crees solo tendrán acceso a los datos de <?= e($iglesia['nombre']) ?>.</p>
</section>

<?php if ($ok): ?><div class="alerta alerta-ok"><?= e($ok) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alerta alerta-error"><?= e($error) ?></div><?php endif; ?>

<div class="dos-columnas">
  <section class="tarjeta">
    <h2 class="tarjeta-titulo">Nuevo integrante</h2>
    <form method="post" class="formulario">
      <label>Nombre completo
        <input type="text" name="nombre" required placeholder="Hna. Rosa Fuentes">
      </label>
      <label>Correo electrónico
        <input type="email" name="email" required placeholder="rosa@correo.cl">
      </label>
      <label>Rol
        <select name="rol" required>
          <option value="tesorero">Tesorero/a (accede a Finanzas)</option>
          <option value="secretaria">Secretario/a (Agenda y Notas)</option>
          <option value="otro">Otro (Agenda y Notas)</option>
        </select>
      </label>
      <label>Contraseña temporal (mín. 8 caracteres)
        <input type="text" name="password" required minlength="8">
        <small>Deberá cambiarla en su primer ingreso, igual que tú.</small>
      </label>
      <button type="submit" class="boton boton-primario boton-ancho">Crear usuario</button>
    </form>
  </section>

  <section class="tarjeta">
    <h2 class="tarjeta-titulo">Integrantes</h2>
    <div class="tabla-scroll">
      <table class="tabla">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead>
        <tbody>
          <?php foreach ($equipo as $miembro): ?>
          <tr>
            <td><?= e($miembro['nombre']) ?></td>
            <td><?= e($miembro['email']) ?></td>
            <td><span class="pill pill-rol"><?= e(ucfirst($miembro['rol'])) ?></span></td>
            <td><?= $miembro['debe_cambiar_password'] ? '<span class="pill pill-pendiente">Primer ingreso pendiente</span>' : '<span class="pill pill-activa">Activo</span>' ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </section>
</div>
<?php require __DIR__ . '/../partials/footer.php'; ?>
