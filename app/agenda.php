<?php
/* Módulo 1 — Agenda: calendario mensual estilo Google Calendar */
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/helpers.php';

$u = requiere_rol(['pastor', 'tesorero', 'secretaria', 'otro']);
$st = db()->prepare('SELECT * FROM iglesias WHERE id = ?');
$st->execute([$u['iglesia_id']]);
$iglesia = $st->fetch();

$titulo = 'Agenda';
$activo = 'agenda';
require __DIR__ . '/../partials/header_app.php';
?>
<section class="hero">
  <p class="eyebrow">Módulo de agenda</p>
  <h1>Planificación de la iglesia</h1>
  <p class="hero-sub">Haz clic en un día para agendar. Si es un culto, invita a los predicadores por correo y ellos confirmarán con un clic.</p>
</section>

<section class="tarjeta">
  <div class="cal-cabecera">
    <button class="boton boton-suave" id="mesAnterior" aria-label="Mes anterior">‹</button>
    <h2 id="mesTitulo" class="cal-mes"></h2>
    <button class="boton boton-suave" id="mesSiguiente" aria-label="Mes siguiente">›</button>
  </div>
  <div class="cal-dias-semana">
    <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
  </div>
  <div class="cal-grilla" id="calGrilla"></div>
  <div class="cal-leyenda">
    <span class="chip chip-culto">Culto</span><span class="chip chip-limpieza">Limpieza</span>
    <span class="chip chip-reunion">Reunión</span><span class="chip chip-ensayo">Ensayo</span>
    <span class="chip chip-visita">Visita</span><span class="chip chip-otro">Otro</span>
  </div>
</section>

<!-- Modal para crear evento -->
<div class="modal-fondo oculto" id="modalEvento">
  <div class="modal">
    <h2>Nuevo evento</h2>
    <p class="modal-sub" id="modalFechaTexto"></p>
    <form id="formEvento" class="formulario">
      <input type="hidden" name="fecha" id="evFecha">
      <label>Tipo de evento
        <select name="tipo" id="evTipo" required>
          <option>Culto</option><option>Limpieza</option><option>Reunión</option>
          <option>Ensayo</option><option>Visita</option><option>Otro</option>
        </select>
      </label>
      <label>Hora de inicio
        <input type="time" name="hora_inicio" id="evHora">
      </label>
      <label>Descripción (opcional)
        <input type="text" name="descripcion" id="evDesc" maxlength="300" placeholder="Culto de acción de gracias">
      </label>
      <label id="campoPredicadores">Correos de los predicadores (separados por coma)
        <input type="text" id="evPredicadores" placeholder="pr.gonzalez@correo.cl, hna.maria@correo.cl">
        <small>Cada uno recibirá un correo para confirmar o rechazar la invitación.</small>
      </label>
      <div class="modal-botones">
        <button type="button" class="boton boton-suave" id="cerrarModal">Cancelar</button>
        <button type="submit" class="boton boton-primario">Agendar</button>
      </div>
    </form>
  </div>
</div>

<script src="../js/agenda.js"></script>
<?php require __DIR__ . '/../partials/footer.php'; ?>
