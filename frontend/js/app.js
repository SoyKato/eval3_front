// ==================== DASHBOARD ====================

/**
 * Inicializa el dashboard
 */
async function inicializarDashboard() {
  await cargarEstadisticas();
  await cargarCitasDeHoy();
  setupNavegacion();
}

/**
 * Carga estadísticas del dashboard
 */
async function cargarEstadisticas() {
  try {
    const [pacientesRes, doctoresRes, citasRes, estadisticasRes] = await Promise.all([
      getPacientes(),
      getDoctores(),
      getCitas(),
      getEstadisticasDoctores()
    ]);

    const totalPacientes = pacientesRes.data.length;
    const totalDoctores = doctoresRes.data.length;

    // Citas de hoy
    const hoy = obtenerFechaActual();
    const citasHoy = citasRes.data.filter(c => c.fecha === hoy && c.estado === 'programada');

    // Citas próximas 24 horas
    const ahora = new Date();
    const proximas24h = citasRes.data.filter(c => {
      const iso = parseDateToISO(c.fecha);
      const time24 = parseTimeTo24(c.hora);
      if (!iso || !time24) return false;
      const [y, m, d] = iso.split('-').map(Number);
      const [hh, mm] = time24.split(':').map(Number);
      const citaFecha = new Date(y, m - 1, d, hh, mm, 0);
      return citaFecha >= ahora && citaFecha <= new Date(ahora.getTime() + 24 * 60 * 60 * 1000) && c.estado === 'programada';
    });

    // Actualizar tarjetas de estadísticas
    document.getElementById('totalPacientes').textContent = totalPacientes;
    document.getElementById('totalDoctores').textContent = totalDoctores;
    document.getElementById('citasHoy').textContent = citasHoy.length;
    document.getElementById('citasProximas').textContent = proximas24h.length;

    // Doctor con más citas
    if (estadisticasRes.data.doctor) {
      document.getElementById('doctorTop').textContent = `${estadisticasRes.data.doctor.nombre} (${estadisticasRes.data.totalCitas})`;
    }
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

/**
 * Carga citas de hoy
 */
async function cargarCitasDeHoy() {
  try {
    const hoy = obtenerFechaActual();
    const resultado = await getCitas(hoy);
    const citas = resultado.data;
    const pacientesRes = await getPacientes();
    const doctoresRes = await getDoctores();
    const pacientes = pacientesRes.data;
    const doctores = doctoresRes.data;

    const container = document.getElementById('citasDeHoy');

    if (citas.length === 0) {
      mostrarVacio(container, 'No hay citas programadas para hoy');
      return;
    }

    let html = '<div class="lista-citas-hoy">';

    citas.forEach(cita => {
      const paciente = pacientes.find(p => p.id === cita.pacienteId);
      const doctor = doctores.find(d => d.id === cita.doctorId);
      const estadoClase = cita.estado === 'programada' ? 'cita-programada' : 'cita-cancelada';

      html += `
        <div class="cita-item ${estadoClase}">
          <div class="cita-hora">${cita.hora}</div>
          <div class="cita-info">
            <div class="cita-paciente">${paciente ? paciente.nombre : 'N/A'}</div>
            <div class="cita-doctor">${doctor ? doctor.nombre : 'N/A'}</div>
          </div>
          <div class="cita-estado">
            <span class="badge ${cita.estado === 'programada' ? 'estado-verde' : 'estado-rojo'}">
              ${cita.estado}
            </span>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Error al cargar citas de hoy:', error);
    mostrarError(document.getElementById('citasDeHoy'), 'Error al cargar citas');
  }
}

/**
 * Setup de navegación
 */
function setupNavegacion() {
  const enlacesNav = document.querySelectorAll('.nav-link');
  enlacesNav.forEach(enlace => {
    enlace.addEventListener('click', (e) => {
      enlacesNav.forEach(el => el.classList.remove('activo'));
      enlace.classList.add('activo');
    });
  });

  // Marcar inicio como activo al cargar
  document.querySelector('[href="index.html"]')?.classList.add('activo');
}

/**
 * Abre menú móvil
 */
function abrirMenuMovil() {
  const nav = document.querySelector('nav');
  nav.classList.toggle('abierto');
}

/**
 * Cierra modales al hacer click fuera
 */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});
