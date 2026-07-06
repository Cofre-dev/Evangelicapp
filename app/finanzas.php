<?php
/* Módulo 2 — Finanzas: ingresos, egresos, dashboard automático y exportación */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

$u = requiere_rol(['pastor', 'tesorero']);
$st = db()->prepare('SELECT * FROM iglesias WHERE id = ?');
$st->execute([$u['iglesia_id']]);
$iglesia = $st->fetch();

$titulo = 'Finanzas';
$activo = 'finanzas';
require __DIR__ . '/../partials/header_app.php';
?>
<section class="hero">
  <p class="eyebrow">Módulo de finanzas</p>
  <h1>Mayordomía de <?= e($iglesia['nombre']) ?></h1>
  <p class="hero-sub">Solo tu iglesia puede ver estos datos: cada congregación es autónoma.</p>
</section>

<section class="tarjetas-grid tarjetas-3" id="resumenFinanzas">
  <div class="tarjeta tarjeta-dato"><span class="dato-numero monto-ingreso" id="resIngresos">$0</span><span class="dato-nombre">Total ingresos</span></div>
  <div class="tarjeta tarjeta-dato"><span class="dato-numero monto-egreso" id="resEgresos">$0</span><span class="dato-nombre">Total egresos</span></div>
  <div class="tarjeta tarjeta-dato"><span class="dato-numero" id="resBalance">$0</span><span class="dato-nombre">Balance</span></div>
</section>

<div class="dos-columnas">
  <section class="tarjeta">
    <h2 class="tarjeta-titulo">Registrar movimiento</h2>
    <form id="formMovimiento" class="formulario">
      <label>Tipo
        <select name="tipo" required>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
      </label>
      <label>Categoría
        <input type="text" name="categoria" required list="categorias" placeholder="Diezmos, Arriendo, Luz…">
        <datalist id="categorias">
          <option>Diezmos</option><option>Ofrendas</option><option>Donaciones</option><option>Actividades</option>
          <option>Arriendo</option><option>Luz</option><option>Agua</option><option>Mantención</option>
          <option>Ayuda social</option><option>Materiales</option>
        </datalist>
      </label>
      <label>Monto (CLP)
        <input type="number" name="monto" min="1" step="1" required placeholder="50000">
      </label>
      <label>Fecha del movimiento
        <input type="date" name="fecha" required value="<?= date('Y-m-d') ?>">
      </label>
      <label>Descripción (opcional)
        <input type="text" name="descripcion" maxlength="300" placeholder="Ofrenda del culto dominical">
      </label>
      <button type="submit" class="boton boton-primario boton-ancho">Guardar</button>
    </form>
  </section>

  <section class="tarjeta">
    <h2 class="tarjeta-titulo">Egresos por categoría</h2>
    <canvas id="graficoCategorias" height="220"></canvas>
  </section>
</div>

<section class="tarjeta">
  <h2 class="tarjeta-titulo">Ingresos vs egresos por mes</h2>
  <canvas id="graficoMeses" height="110"></canvas>
</section>

<section class="tarjeta">
  <div class="tarjeta-cabecera">
    <h2 class="tarjeta-titulo">Historial de movimientos</h2>
    <a class="boton boton-suave" href="../api/exportar_excel.php">Exportar a Excel</a>
  </div>
  <div class="tabla-scroll">
    <table class="tabla">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th class="der">Monto</th><th></th></tr></thead>
      <tbody id="tablaMovimientos"><tr><td colspan="6" class="vacio">Cargando…</td></tr></tbody>
    </table>
  </div>
</section>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<script src="../js/finanzas.js"></script>
<?php require __DIR__ . '/../partials/footer.php'; ?>
