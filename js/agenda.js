/* Calendario mensual estilo Google Calendar — JS puro */
(() => {
  const grilla   = document.getElementById('calGrilla');
  const tituloEl = document.getElementById('mesTitulo');
  const modal    = document.getElementById('modalEvento');
  const form     = document.getElementById('formEvento');
  const campoPred = document.getElementById('campoPredicadores');

  let cursor  = new Date();          // mes que se está mostrando
  cursor.setDate(1);
  let eventos = [];

  const claseTipo = t => 'chip-' + t.toLowerCase().replace('ó', 'o');
  const dosDigitos = n => String(n).padStart(2, '0');
  const mesISO = d => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}`;

  async function cargarMes() {
    const res = await fetch(`../api/eventos.php?mes=${mesISO(cursor)}`);
    eventos = res.ok ? await res.json() : [];
    render();
  }

  function render() {
    tituloEl.textContent = cursor
      .toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
      .replace(/^./, c => c.toUpperCase());

    grilla.innerHTML = '';
    const anio = cursor.getFullYear(), mes = cursor.getMonth();
    const primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7; // semana parte en lunes
    const diasMes   = new Date(anio, mes + 1, 0).getDate();
    const hoy       = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < primerDia; i++) {
      grilla.insertAdjacentHTML('beforeend', '<div class="cal-celda cal-vacia"></div>');
    }

    for (let dia = 1; dia <= diasMes; dia++) {
      const fecha = `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(dia)}`;
      const delDia = eventos.filter(e => e.fecha === fecha);

      const chips = delDia.map(e => {
        const hora = e.hora_inicio ? e.hora_inicio.slice(0, 5) + ' ' : '';
        const conf = e.tipo === 'Culto' && e.predicadores > 0
          ? ` <small>(${e.confirmados}/${e.predicadores}✓)</small>` : '';
        const detalle = e.descripcion ? `\n${e.descripcion}` : '';
        return `<span class="chip ${claseTipo(e.tipo)}" title="${hora}${e.tipo}${detalle}">${hora}${e.tipo}${conf}</span>`;
      }).join('');

      grilla.insertAdjacentHTML('beforeend',
        `<div class="cal-celda ${fecha === hoy ? 'cal-hoy' : ''}" data-fecha="${fecha}">
           <span class="cal-num">${dia}</span>${chips}
         </div>`);
    }
  }

  /* Abrir el modal al hacer clic en un día */
  grilla.addEventListener('click', ev => {
    const celda = ev.target.closest('.cal-celda[data-fecha]');
    if (!celda) return;
    form.reset();
    document.getElementById('evFecha').value = celda.dataset.fecha;
    document.getElementById('modalFechaTexto').textContent =
      new Date(celda.dataset.fecha + 'T12:00:00')
        .toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    alternarPredicadores();
    modal.classList.remove('oculto');
  });

  /* El campo de predicadores solo aplica a los cultos */
  const alternarPredicadores = () => {
    campoPred.style.display = document.getElementById('evTipo').value === 'Culto' ? '' : 'none';
  };
  document.getElementById('evTipo').addEventListener('change', alternarPredicadores);

  document.getElementById('cerrarModal').addEventListener('click', () => modal.classList.add('oculto'));
  modal.addEventListener('click', ev => { if (ev.target === modal) modal.classList.add('oculto'); });

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const datos = {
      fecha:        document.getElementById('evFecha').value,
      tipo:         document.getElementById('evTipo').value,
      hora_inicio:  document.getElementById('evHora').value,
      descripcion:  document.getElementById('evDesc').value,
      predicadores: document.getElementById('evPredicadores').value,
    };
    const res = await fetch('../api/eventos.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    if (res.ok) {
      const r = await res.json();
      if (r.correos_enviados > 0) alert(`Evento agendado. Se enviaron ${r.correos_enviados} invitación(es) por correo.`);
      modal.classList.add('oculto');
      cargarMes();
    } else {
      alert('No se pudo guardar el evento. Revisa los datos.');
    }
  });

  document.getElementById('mesAnterior').addEventListener('click', () => { cursor.setMonth(cursor.getMonth() - 1); cargarMes(); });
  document.getElementById('mesSiguiente').addEventListener('click', () => { cursor.setMonth(cursor.getMonth() + 1); cargarMes(); });

  cargarMes();
})();
