/* Módulo de finanzas: tabla + dashboard automático con Chart.js */
(() => {
  const clp = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);
  const cuerpoTabla = document.getElementById('tablaMovimientos');
  let graficoCat = null, graficoMes = null;

  const PASTEL = ['#8FC1E3', '#B7A8D6', '#E9C46A', '#7FB89B', '#DE9CA4', '#A3C9E8', '#D9C7A0', '#9FB8CC'];

  async function cargar() {
    const res = await fetch('../api/movimientos.php');
    if (!res.ok) return;
    const d = await res.json();

    // Tarjetas de resumen
    document.getElementById('resIngresos').textContent = clp(d.totales.ingresos);
    document.getElementById('resEgresos').textContent  = clp(d.totales.egresos);
    document.getElementById('resBalance').textContent  = clp(d.totales.ingresos - d.totales.egresos);

    // Tabla
    cuerpoTabla.innerHTML = d.movimientos.length ? '' :
      '<tr><td colspan="6" class="vacio">Aún no hay movimientos registrados.</td></tr>';
    for (const m of d.movimientos) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.fecha.split('-').reverse().join('-')}</td>
        <td><span class="pill ${m.tipo === 'ingreso' ? 'pill-activa' : 'pill-atrasada'}">${m.tipo}</span></td>
        <td>${m.categoria}</td>
        <td>${m.descripcion ?? ''}</td>
        <td class="der ${m.tipo === 'ingreso' ? 'monto-ingreso' : 'monto-egreso'}">${m.tipo === 'ingreso' ? '+' : '−'}${clp(m.monto)}</td>
        <td><button class="boton boton-suave btn-borrar" data-id="${m.id}" title="Eliminar">✕</button></td>`;
      cuerpoTabla.appendChild(tr);
    }

    // Gráfico: egresos por categoría (torta)
    graficoCat?.destroy();
    graficoCat = new Chart(document.getElementById('graficoCategorias'), {
      type: 'doughnut',
      data: {
        labels: d.por_categoria.map(c => c.categoria),
        datasets: [{ data: d.por_categoria.map(c => +c.total), backgroundColor: PASTEL, borderColor: '#fff', borderWidth: 2 }],
      },
      options: { plugins: { legend: { position: 'bottom' } } },
    });

    // Gráfico: ingresos vs egresos por mes (barras)
    const meses = Object.keys(d.por_mes);
    graficoMes?.destroy();
    graficoMes = new Chart(document.getElementById('graficoMeses'), {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [
          { label: 'Ingresos', data: meses.map(m => d.por_mes[m].ingreso || 0), backgroundColor: '#7FB89B', borderRadius: 6 },
          { label: 'Egresos',  data: meses.map(m => d.por_mes[m].egreso  || 0), backgroundColor: '#DE9CA4', borderRadius: 6 },
        ],
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { ticks: { callback: v => clp(v) } } },
      },
    });
  }

  /* Registrar movimiento */
  document.getElementById('formMovimiento').addEventListener('submit', async ev => {
    ev.preventDefault();
    const f = ev.target;
    const res = await fetch('../api/movimientos.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: f.tipo.value,
        categoria: f.categoria.value,
        monto: f.monto.value,
        fecha: f.fecha.value,
        descripcion: f.descripcion.value,
      }),
    });
    if (res.ok) { f.reset(); f.fecha.value = new Date().toISOString().slice(0, 10); cargar(); }
    else alert('No se pudo guardar. Revisa los datos.');
  });

  /* Eliminar movimiento */
  cuerpoTabla.addEventListener('click', async ev => {
    const btn = ev.target.closest('.btn-borrar');
    if (!btn || !confirm('¿Eliminar este movimiento?')) return;
    await fetch('../api/movimientos.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'eliminar', id: btn.dataset.id }),
    });
    cargar();
  });

  cargar();
})();
