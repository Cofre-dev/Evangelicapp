<?php
/* Cabecera + navegación compartida.
   Espera: $u (payload JWT), $titulo, $activo, y opcionalmente $iglesia */
$esAdmin = $u['rol'] === 'superadmin';
$raiz    = '../'; // todas las vistas viven en /admin o /app
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($titulo) ?> · Gestión de Iglesias</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= $raiz ?>css/style.css">
</head>
<body>
<header class="barra">
  <div class="barra-marca">
    <?php if (!$esAdmin && !empty($iglesia['logo'])): ?>
      <img src="<?= $raiz . e($iglesia['logo']) ?>" alt="Logo" class="barra-logo">
    <?php endif; ?>
    <span class="barra-nombre"><?= !$esAdmin && !empty($iglesia) ? e($iglesia['nombre']) : 'Panel general' ?></span>
  </div>
  <nav class="barra-nav">
    <?php if ($esAdmin): ?>
      <a class="<?= $activo === 'panel' ? 'activo' : '' ?>" href="<?= $raiz ?>admin/dashboard.php">Iglesias</a>
      <a class="<?= $activo === 'crear' ? 'activo' : '' ?>" href="<?= $raiz ?>admin/crear_pastor.php">Crear iglesia</a>
    <?php else: ?>
      <a class="<?= $activo === 'inicio'   ? 'activo' : '' ?>" href="<?= $raiz ?>app/dashboard.php">Inicio</a>
      <a class="<?= $activo === 'agenda'   ? 'activo' : '' ?>" href="<?= $raiz ?>app/agenda.php">Agenda</a>
      <a class="<?= $activo === 'finanzas' ? 'activo' : '' ?>" href="<?= $raiz ?>app/finanzas.php">Finanzas</a>
      <a class="<?= $activo === 'notas'    ? 'activo' : '' ?>" href="<?= $raiz ?>app/notas.php">Notas</a>
      <?php if ($u['rol'] === 'pastor'): ?>
        <a class="<?= $activo === 'usuarios' ? 'activo' : '' ?>" href="<?= $raiz ?>app/usuarios.php">Mi equipo</a>
      <?php endif; ?>
    <?php endif; ?>
    <a class="barra-salir" href="<?= $raiz ?>logout.php">Salir</a>
  </nav>
</header>
<main class="contenedor">
