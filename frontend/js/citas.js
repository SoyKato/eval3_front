// ==================== GESTIÓN DE CITAS ====================

let citas = [];
let pacientes = [];
let doctores = [];
let especialidades = [];
let citaEnDetalle = null;

/**
 * Inicializa la página de citas
 */
async function inicializarCitas() {
  await cargarDatos();
  extraerEspecialidades();
  setupEventosCitas();
  renderizarCitas();
}

/**
 * Carga todos los datos necesarios
 */
async function cargarDatos() {
  try {
    mostrarCargando(document.getElementById('listaCitas'));
    const [citasRes, pacientesRes, doctoresRes] = await Promise.all([
      getCitas(),
      getPacientes(),
      getDoctores()
    ]);
    citas = citasRes.data;
    pacientes = pacientesRes.data;
    doctores = doctoresRes.data;
  } catch (error) {
    mostrarError(document.getElementById('listaCitas'), 'Error al cargar datos');
    console.error(error);
  }
}

/**
 * Extrae especialidades únicas
 */
function extraerEspecialidades() {
  especialidades = [...new Set(doctores.map(d => d.especialidad))];
}

/**
 * Renderiza la lista de citas
 */
function renderizarCitas(filtroFecha = null, filtroEstado = null) {
  const container = document.getElementById('listaCitas');
  let citasFiltradas = citas;

  if (filtroFecha) {
    citasFiltradas = citasFiltradas.filter(c => c.fecha === filtroFecha);
  }

  if (filtroEstado && filtroEstado !== 'todas') {
    citasFiltradas = citasFiltradas.filter(c => c.estado === filtroEstado);
  }

  if (!citasFiltradas || citasFiltradas.length === 0) {
    mostrarVacio(container, 'No hay citas registradas. ¡Agrega la primera!');
    return;
  }

  let html = `
    <div class="tabla-responsive">
      <table class="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Paciente</th>
            <th>Doctor</th>
            <th>Especialidad</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  citasFiltradas.forEach(cita => {
    const paciente = pacientes.find(p => p.id === cita.pacienteId);
    const doctor = doctores.find(d => d.id === cita.doctorId);
    const estadoClase = cita.estado === 'programada' ? 'estado-verde' : 'estado-rojo';

    html += `
      <tr>
        <td>${cita.id}</td>
        <td>${formatearFechaLarga(cita.fecha)}</td>
        <td>${cita.hora}</td>
        <td>${paciente ? paciente.nombre : 'N/A'}</td>
        <td>${doctor ? doctor.nombre : 'N/A'}</td>
        <td>${doctor ? doctor.especialidad : 'N/A'}</td>
        <td>${cita.motivo}</td>
        <td><span class="badge ${estadoClase}">${cita.estado}</span></td>
        <td class="acciones">
          <button class="btn-icon" onclick="verDetalleCita('${cita.id}')" title="Ver detalles">👁️</button>
          ${cita.estado === 'programada' ? `<button class="btn-icon btn-cancelar" onclick="cancelarCitaModal('${cita.id}')" title="Cancelar">❌</button>` : ''}
          <button class="btn-icon btn-cancelar" onclick="eliminarCita('${cita.id}')" title="Borrar">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  </div>
  `;

  container.innerHTML = html;
}

/**
 * Abre el formulario para crear nueva cita
 */
async function abrirFormularioCita() {
  const modal = document.getElementById('modalCita');
  document.getElementById('formularioCita').reset();
  limpiarErrores(document.getElementById('formularioCita'));

  // Cargar pacientes
  const selectPaciente = document.getElementById('pacienteSelect');
  selectPaciente.innerHTML = '<option value="">Selecciona un paciente...</option>';
  pacientes.forEach(p => {
    selectPaciente.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
  });

  // Cargar especialidades
  const selectEspecialidad = document.getElementById('especialidadSelect');
  selectEspecialidad.innerHTML = '<option value="">Selecciona una especialidad...</option>';
  especialidades.forEach(esp => {
    selectEspecialidad.innerHTML += `<option value="${esp}">${esp}</option>`;
  });

  // Establecer fecha mínima
  document.getElementById('fechaCita').min = obtenerFechaActual();

  modal.style.display = 'flex';
}

/**
 * Cierra el modal de cita
 */
function cerrarModalCita() {
  document.getElementById('modalCita').style.display = 'none';
  document.getElementById('formularioCita').reset();
  limpiarErrores(document.getElementById('formularioCita'));
}

/**
 * Al cambiar especialidad, carga los doctores disponibles
 */
async function onCambiarEspecialidad() {
  const especialidad = document.getElementById('especialidadSelect').value;
  const selectDoctor = document.getElementById('doctorSelect');

  if (!especialidad) {
    selectDoctor.innerHTML = '<option value="">Selecciona un doctor...</option>';
    return;
  }

  try {
    const resultado = await getDoctoresPorEspecialidad(especialidad);
    const doctoresEspecialidad = resultado.data;

    selectDoctor.innerHTML = '<option value="">Selecciona un doctor...</option>';
    doctoresEspecialidad.forEach(d => {
      selectDoctor.innerHTML += `<option value="${d.id}">${d.nombre}</option>`;
    });
  } catch (error) {
    mostrarAlerta('Error al cargar doctores', 'error');
  }
}

/**
 * Al cambiar doctor y fecha, valida disponibilidad
 */
async function validarDisponibilidadDoctor() {
  const doctorId = document.getElementById('doctorSelect').value;
  const fecha = document.getElementById('fechaCita').value;

  if (!doctorId || !fecha) return;

  try {
    const doctor = doctores.find(d => d.id === doctorId);
    const diaSemana = obtenerDiaSemana(fecha);

    if (!doctor.diasDisponibles.includes(diaSemana)) {
      mostrarAlerta(`El doctor no atiende los ${diaSemana}s`, 'error');
      document.getElementById('doctorSelect').value = '';
      return;
    }

    mostrarAlerta('Doctor disponible ese día', 'success');
  } catch (error) {
    console.error(error);
  }
}

/**
 * Valida el formulario de cita
 */
function validarFormularioCita() {
  limpiarErrores(document.getElementById('formularioCita'));

  const pacienteId = document.getElementById('pacienteSelect').value;
  const especialidad = document.getElementById('especialidadSelect').value;
  const doctorId = document.getElementById('doctorSelect').value;
  const fecha = document.getElementById('fechaCita').value;
  const hora = document.getElementById('horaCita').value;
  const motivo = document.getElementById('motivoCita').value.trim();

  let valido = true;

  if (!pacienteId) {
    mostrarErrorCampo(document.getElementById('pacienteSelect'), 'Selecciona un paciente');
    valido = false;
  }

  if (!especialidad) {
    mostrarErrorCampo(document.getElementById('especialidadSelect'), 'Selecciona una especialidad');
    valido = false;
  }

  if (!doctorId) {
    mostrarErrorCampo(document.getElementById('doctorSelect'), 'Selecciona un doctor');
    valido = false;
  }

  if (!fecha) {
    mostrarErrorCampo(document.getElementById('fechaCita'), 'Selecciona una fecha');
    valido = false;
  } else if (!esFechaHoraFutura(fecha, hora)) {
    mostrarErrorCampo(document.getElementById('fechaCita'), 'La fecha y hora deben ser futuras');
    valido = false;
  }

  if (!hora || !validarHora(hora)) {
    mostrarErrorCampo(document.getElementById('horaCita'), 'Selecciona una hora válida (HH:MM o HH:MM AM/PM)');
    valido = false;
  }

  if (!motivo || motivo.length > 200) {
    mostrarErrorCampo(document.getElementById('motivoCita'), 'El motivo es obligatorio (máximo 200 caracteres)');
    valido = false;
  }

  if (valido) {
    const doctor = doctores.find(d => d.id === doctorId);
    const hora24 = parseTimeTo24(hora);
    const inicio = doctor.horarioInicio ?? (doctor.horario && doctor.horario.inicio) ?? null;
    const fin = doctor.horarioFin ?? (doctor.horario && doctor.horario.fin) ?? null;
    if (!hora24 || !inicio || !fin || hora24 < inicio || hora24 > fin) {
      mostrarErrorCampo(document.getElementById('horaCita'), `Hora fuera del horario del doctor (${inicio} - ${fin})`);
      valido = false;
    }
  }

  return valido;
}

/**
 * Guarda una cita
 */
async function guardarCita() {
  if (!validarFormularioCita()) return;

  const datos = {
    pacienteId: document.getElementById('pacienteSelect').value,
    doctorId: document.getElementById('doctorSelect').value,
    fecha: document.getElementById('fechaCita').value,
    hora: document.getElementById('horaCita').value,
    motivo: document.getElementById('motivoCita').value.trim()
  };

  try {
    const btnGuardar = document.querySelector('#modalCita .btn-guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    await createCita(datos);
    mostrarAlerta('Cita registrada correctamente', 'success');

    cerrarModalCita();
    await cargarDatos();
    renderizarCitas();
  } catch (error) {
    mostrarAlerta(error.message || 'Error al guardar cita', 'error');
  } finally {
    try {
      const btnGuardar = document.querySelector('#modalCita .btn-guardar');
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
      }
    } catch (e) {
      // noop
    }
  }
}

/**
 * Ver detalle de una cita
 */
async function verDetalleCita(id) {
  try {
    const cita = citas.find(c => c.id === id);
    const paciente = pacientes.find(p => p.id === cita.pacienteId);
    const doctor = doctores.find(d => d.id === cita.doctorId);

    const estadoClase = cita.estado === 'programada' ? 'estado-verde' : 'estado-rojo';

    let html = `
      <div class="detalle-cita">
        <div class="seccion">
          <h4>Información de la Cita</h4>
          <p><strong>ID:</strong> ${cita.id}</p>
          <p><strong>Fecha:</strong> ${formatearFechaLarga(cita.fecha)}</p>
          <p><strong>Hora:</strong> ${cita.hora}</p>
          <p><strong>Motivo:</strong> ${cita.motivo}</p>
          <p><strong>Estado:</strong> <span class="badge ${estadoClase}">${cita.estado}</span></p>
        </div>

        <div class="seccion">
          <h4>Información del Paciente</h4>
          <p><strong>Nombre:</strong> ${paciente.nombre}</p>
          <p><strong>Email:</strong> ${paciente.email}</p>
          <p><strong>Teléfono:</strong> ${paciente.telefono}</p>
          <p><strong>Edad:</strong> ${paciente.edad} años</p>
        </div>

        <div class="seccion">
          <h4>Información del Doctor</h4>
          <p><strong>Nombre:</strong> ${doctor.nombre}</p>
          <p><strong>Especialidad:</strong> ${doctor.especialidad}</p>
          <p><strong>Horario:</strong> ${doctor.horarioInicio} - ${doctor.horarioFin}</p>
        </div>
    `;

    if (cita.estado === 'programada') {
      html += `
        <div class="acciones-detalle">
          <button class="btn btn-danger" onclick="cancelarCitaModal('${id}')">Cancelar Cita</button>
        </div>
      `;
    }

    html += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-contenido">
        <div class="modal-header">
          <h2>Detalle de Cita</h2>
          <button class="btn-cerrar" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          ${html}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  } catch (error) {
    mostrarAlerta(error.message || 'Error al cargar detalle', 'error');
  }
}

/**
 * Abre modal de confirmación para cancelar cita
 */
function cancelarCitaModal(id) {
  const confirmacion = confirm('¿Está seguro de cancelar esta cita?');
  if (confirmacion) {
    cancelarCita(id);
  }
}

/**
 * Cancela una cita
 */
async function cancelarCita(id) {
  try {
    await putData(`/citas/${id}/cancelar`, {});
    mostrarAlerta('Cita cancelada correctamente', 'success');
    await cargarDatos();
    renderizarCitas();
    document.querySelectorAll('.modal').forEach(m => m.remove());
  } catch (error) {
    mostrarAlerta(error.message || 'Error al cancelar cita', 'error');
  }
}

/**
 * Elimina una cita
 */
async function eliminarCita(id) {
  const confirmacion = confirm('¿Está seguro de eliminar esta cita?');
  if (!confirmacion) return;

  try {
    await deleteCita(id);
    mostrarAlerta('Cita eliminada correctamente', 'success');
    await cargarDatos();
    renderizarCitas();
  } catch (error) {
    mostrarAlerta(error.message || 'Error al eliminar cita', 'error');
  }
}

/**
 * Setup de eventos para citas
 */
function setupEventosCitas() {
  const formulario = document.getElementById('formularioCita');
  if (formulario) {
    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarCita();
    });
  }

  const filtroFecha = document.getElementById('filtroFecha');
  const filtroEstado = document.getElementById('filtroEstado');

  if (filtroFecha) {
    filtroFecha.addEventListener('change', () => {
      renderizarCitas(filtroFecha.value || null, filtroEstado?.value || null);
    });
  }

  if (filtroEstado) {
    filtroEstado.addEventListener('change', () => {
      renderizarCitas(filtroFecha?.value || null, filtroEstado.value);
    });
  }

  const selectEspecialidad = document.getElementById('especialidadSelect');
  if (selectEspecialidad) {
    selectEspecialidad.addEventListener('change', onCambiarEspecialidad);
  }

  const selectDoctor = document.getElementById('doctorSelect');
  if (selectDoctor) {
    selectDoctor.addEventListener('change', validarDisponibilidadDoctor);
  }

  const fechaCita = document.getElementById('fechaCita');
  if (fechaCita) {
    fechaCita.addEventListener('change', validarDisponibilidadDoctor);
  }
}
