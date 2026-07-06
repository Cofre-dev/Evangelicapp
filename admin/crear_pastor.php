<?php
/* El superadmin crea una IGLESIA junto con su PASTOR (usuario + contraseña temporal) */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

$u = requiere_rol(['superadmin']);

$regiones = [
    'Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo','Valparaíso',
    'Metropolitana de Santiago',"O'Higgins",'Maule','Ñuble','Biobío','La Araucanía',
    'Los Ríos','Los Lagos','Aysén','Magallanes'
];

$ok = ''; $error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombreIglesia = trim($_POST['nombre_iglesia'] ?? '');
    $comuna        = trim($_POST['comuna'] ?? '');
    $region        = trim($_POST['region'] ?? '');
    $direccion     = trim($_POST['direccion'] ?? '');
    $nombrePastor  = trim($_POST['nombre_pastor'] ?? '');
    $email         = trim($_POST['email'] ?? '');
    $passTemporal  = $_POST['password'] ?? '';

    if (!$nombreIglesia || !$comuna || !$region || !$nombrePastor || !$email || strlen($passTemporal) < 8) {
        $error = 'Completa todos los campos. La contraseña temporal debe tener al menos 8 caracteres.';
    } else {
        $st = db()->prepare('SELECT id FROM usuarios WHERE email = ?');
        $st->execute([$email]);
        if ($st->fetch()) {
            $error = 'Ya existe un usuario con ese correo.';
        } else {
            try {
                db()->beginTransaction();
                $logo = isset($_FILES['logo']) ? subir_logo($_FILES['logo']) : null;

                db()->prepare('INSERT INTO iglesias (nombre, logo, direccion, comuna, region) VALUES (?,?,?,?,?)')
                    ->execute([$nombreIglesia, $logo, $direccion, $comuna, $region]);
                $iglesiaId = (int)db()->lastInsertId();

                db()->prepare(
                    'INSERT INTO usuarios (iglesia_id, nombre, email, password_hash, rol, debe_cambiar_password)
                     VALUES (?,?,?,?,"pastor",1)'
                )->execute([$iglesiaId, $nombrePastor, $email, password_hash($passTemporal, PASSWORD_DEFAULT)]);

                db()->commit();
                $ok = "Iglesia «{$nombreIglesia}» creada. Entrega al pastor su acceso: $email / la contraseña temporal. Deberá cambiarla en su primer ingreso.";
            } catch (Exception $ex) {
                db()->rollBack();
                $error = 'Error al guardar: ' . $ex->getMessage();
            }
        }
    }
}

$titulo = 'Crear iglesia';
$activo = 'crear';
require __DIR__ . '/../partials/header_app.php';
?>
<section class="hero hero-admin">
  <p class="eyebrow">Nuevo registro</p>
  <h1>Crear iglesia y su pastor</h1>
  <p class="hero-sub">Al crear una iglesia se genera también la cuenta del pastor con una contraseña temporal. En su primer ingreso deberá completar sus datos y cambiarla.</p>
</section>

<?php if ($ok): ?><div class="alerta alerta-ok"><?= e($ok) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alerta alerta-error"><?= e($error) ?></div><?php endif; ?>

<form method="post" enctype="multipart/form-data" class="tarjeta formulario formulario-dos-columnas">
  <fieldset>
    <legend>La iglesia</legend>
    <label>Nombre de la iglesia
      <input type="text" name="nombre_iglesia" required placeholder="Iglesia Evangélica Monte de Sion">
    </label>
    <label>Logo (JPG, PNG o WebP · máx 2 MB)
      <input type="file" name="logo" accept="image/jpeg,image/png,image/webp">
    </label>
    <label>Dirección
      <input type="text" name="direccion" placeholder="Av. Los Aromos 1234">
    </label>
    <label>Comuna
      <input type="text" name="comuna" required placeholder="Puente Alto">
    </label>
    <label>Región
      <select name="region" required>
        <option value="">Selecciona una región…</option>
        <?php foreach ($regiones as $r): ?><option><?= e($r) ?></option><?php endforeach; ?>
      </select>
    </label>
  </fieldset>

  <fieldset>
    <legend>El pastor</legend>
    <label>Nombre completo
      <input type="text" name="nombre_pastor" required placeholder="Pr. Juan Pérez">
    </label>
    <label>Correo electrónico (será su usuario)
      <input type="email" name="email" required placeholder="juan.perez@correo.cl">
    </label>
    <label>Contraseña temporal (mín. 8 caracteres)
      <input type="text" name="password" required minlength="8" placeholder="Temporal.2026">
      <small>Entrégasela por un canal seguro. El sistema lo obligará a cambiarla.</small>
    </label>
    <button type="submit" class="boton boton-primario">Crear iglesia y pastor</button>
  </fieldset>
</form>
<?php require __DIR__ . '/../partials/footer.php'; ?>
