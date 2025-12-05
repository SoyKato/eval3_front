// ==================== GESTIÓN DE DOCTORES ====================

let doctores = [];
let especialidades = [];
let editandoDoctor = null;

/**
 * Inicializa la página de doctores
 */
async function inicializarDoctores() {
  await cargarDoctores();
  extraerEspecialidades();
  setupEventosDoctores();
  renderizarDoctores();
}

/**
 * Carga doctores del servidor
 */
async function cargarDoctores() {
  try {
    mostrarCargando(document.getElementById('listaDoctores'));
    const resultado = await getDoctores();
    doctores = resultado.data;
  } catch (error) {
    mostrarError(document.getElementById('listaDoctores'), 'Error al cargar doctores');
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
 * Renderiza la lista de doctores
 */
function renderizarDoctores(filtroEspecialidad = null) {
  const container = document.getElementById('listaDoctores');
  let doctoresFiltrados = doctores;

  if (filtroEspecialidad && filtroEspecialidad !== 'todas') {
    doctoresFiltrados = doctores.filter(d => d.especialidad === filtroEspecialidad);
  }

  if (!doctoresFiltrados || doctoresFiltrados.length === 0) {
    mostrarVacio(container, 'No hay doctores registrados. ¡Agrega el primero!');
    return;
  }

  let html = '<div class="grid-doctores">';

  doctoresFiltrados.forEach(doctor => {
    const dias = (doctor.diasDisponibles || []).join(', ');
    html += `
      <div class="tarjeta-doctor">
        <div class="tarjeta-header">
          <h3>${doctor.nombre}</h3>
          <span class="badge">${doctor.especialidad}</span>
        </div>
        <div class="tarjeta-body">
          <p><strong>Horario:</strong> ${doctor.horarioInicio} - ${doctor.horarioFin}</p>
          <p><strong>Días:</strong> ${dias}</p>
        </div>
        <div class="tarjeta-footer">
          <button class="btn-icon" onclick="verAgendaDoctor('${doctor.id}')" title="Ver agenda">📅</button>
          <button class="btn-icon" onclick="editarDoctor('${doctor.id}')" title="Editar">✏️</button>
          <button class="btn-icon btn-cancelar" onclick="eliminarDoctor('${doctor.id}')" title="Borrar">🗑️</button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Abre el formulario para crear/editar doctor
 */
async function abrirFormularioDoctor(id = null) {
  editandoDoctor = id;
  const modal = document.getElementById('modalDoctor');
  const titulo = document.getElementById('tituloDoctor');
  const formulario = document.getElementById('formularioDoctor');

  limpiarErrores(formulario);

  if (id) {
    titulo.textContent = 'Editar Doctor';
    try {
      const resultado = await getDoctor(id);
      const doctor = resultado.data;
      document.getElementById('nombreDoctor').value = doctor.nombre;
      document.getElementById('especialidadDoctor').value = doctor.especialidad;
      document.getElementById('horarioInicioDoctor').value = doctor.horarioInicio;
      document.getElementById('horarioFinDoctor').value = doctor.horarioFin;

      const checkboxes = document.querySelectorAll('input[name="diasDisponibles"]');
      checkboxes.forEach(cb => {
        cb.checked = doctor.diasDisponibles.includes(cb.value);
      });
    } catch (error) {
      mostrarAlerta('Error al cargar doctor', 'error');
    }
  } else {
    titulo.textContent = 'Nuevo Doctor';
    formulario.reset();
    document.querySelectorAll('input[name="diasDisponibles"]').forEach(cb => cb.checked = false);
  }

  modal.style.display = 'flex';
}

/**
 * Cierra el modal de doctor
 */
function cerrarModalDoctor() {
  document.getElementById('modalDoctor').style.display = 'none';
  document.getElementById('formularioDoctor').reset();
  limpiarErrores(document.getElementById('formularioDoctor'));
  editandoDoctor = null;
}

/**
 * Valida el formulario de doctor
 */
function validarFormularioDoctor() {
  limpiarErrores(document.getElementById('formularioDoctor'));
  const nombre = document.getElementById('nombreDoctor').value.trim();
  const especialidad = document.getElementById('especialidadDoctor').value.trim();
  const horarioInicio = document.getElementById('horarioInicioDoctor').value;
  const horarioFin = document.getElementById('horarioFinDoctor').value;
  const diasCheckboxes = document.querySelectorAll('input[name="diasDisponibles"]:checked');

  let valido = true;

  if (!nombre) {
    mostrarErrorCampo(document.getElementById('nombreDoctor'), 'El nombre es obligatorio');
    valido = false;
  }

  if (!especialidad) {
    mostrarErrorCampo(document.getElementById('especialidadDoctor'), 'La especialidad es obligatoria');
    valido = false;
  }

  if (!horarioInicio) {
    mostrarErrorCampo(document.getElementById('horarioInicioDoctor'), 'El horario de inicio es obligatorio');
    valido = false;
  }

  if (!horarioFin) {
    mostrarErrorCampo(document.getElementById('horarioFinDoctor'), 'El horario de fin es obligatorio');
    valido = false;
  }

  if (horarioInicio && horarioFin && !validarRangoHoras(horarioInicio, horarioFin)) {
    mostrarErrorCampo(document.getElementById('horarioFinDoctor'), 'El horario de fin debe ser posterior al de inicio');
    valido = false;
  }

  if (diasCheckboxes.length === 0) {
    const diasContainer = document.querySelector('.dias-disponibles');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = 'Debe seleccionar al menos un día disponible';
    diasContainer.appendChild(errorDiv);
    valido = false;
  }

  return valido;
}

/**
 * Guarda un doctor
 */
async function guardarDoctor() {
  if (!validarFormularioDoctor()) return;

  const diasSeleccionados = Array.from(document.querySelectorAll('input[name="diasDisponibles"]:checked'))
    .map(cb => cb.value);

  const datos = {
    nombre: document.getElementById('nombreDoctor').value.trim(),
    especialidad: document.getElementById('especialidadDoctor').value.trim(),
    horarioInicio: document.getElementById('horarioInicioDoctor').value,
    horarioFin: document.getElementById('horarioFinDoctor').value,
    diasDisponibles: diasSeleccionados
  };

  try {
    const btnGuardar = document.querySelector('#modalDoctor .btn-guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    if (editandoDoctor) {
      await updateDoctor(editandoDoctor, datos);
      mostrarAlerta('Doctor actualizado correctamente', 'success');
    } else {
      await createDoctor(datos);
      mostrarAlerta('Doctor registrado correctamente', 'success');
    }

    cerrarModalDoctor();
    await cargarDoctores();
    extraerEspecialidades();
    renderizarDoctores();
  } catch (error) {
    mostrarAlerta(error.message || 'Error al guardar doctor', 'error');
  }
}

/**
 * Edita un doctor
 */
async function editarDoctor(id) {
  await abrirFormularioDoctor(id);
}

/**
 * Eliminar doctor
 */
async function eliminarDoctor(id) {
  const ok = confirm('¿Seguro que deseas eliminar este doctor? Sus citas programadas se cancelarán.');
  if (!ok) return;
  try {
    await deleteDoctor(id);
    mostrarAlerta('Doctor eliminado', 'success');
    await cargarDoctores();
    extraerEspecialidades();
    renderizarDoctores();
  } catch (error) {
    mostrarAlerta(error.message || 'Error al eliminar doctor', 'error');
  }
}

/**
 * Ver agenda del doctor
 */
async function verAgendaDoctor(id) {
  try {
    const resultado = await getAgendaDoctor(id);
    const citas = resultado.data;
    const doctor = doctores.find(d => d.id === id);

    // Obtener pacientes para poder mostrar nombre en la agenda
    let pacientesLista = [];
    try {
      const pacientesRes = await getPacientes();
      pacientesLista = pacientesRes.data;
    } catch (err) {
      console.warn('No se pudieron cargar pacientes para la agenda del doctor:', err);
    }

    let html = `
      <div class="agenda-doctor">
        <div class="info-doctor">
          <h3>${doctor.nombre}</h3>
          <p><strong>Especialidad:</strong> ${doctor.especialidad}</p>
          <p><strong>Horario:</strong> ${doctor.horarioInicio} - ${doctor.horarioFin}</p>
        </div>
    `;

    if (citas.length === 0) {
      html += '<p class="sin-citas">Sin citas programadas</p>';
    } else {
      const citasProgramadas = citas.filter(c => c.estado === 'programada');
      const citasCanceladas = citas.filter(c => c.estado === 'cancelada');

      html += `
        <div class="estadisticas-agenda">
          <div class="stat">
            <span class="numero">${citasProgramadas.length}</span>
            <span class="label">Programadas</span>
          </div>
          <div class="stat">
            <span class="numero">${citasCanceladas.length}</span>
            <span class="label">Canceladas</span>
          </div>
        </div>

        <div class="tabla-responsive">
          <table class="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Paciente</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
      `;

      citas.forEach(cita => {
        const estadoClase = cita.estado === 'programada' ? 'estado-verde' : 'estado-rojo';
        const paciente = pacientesLista.find(p => p.id === cita.pacienteId);
        const pacienteNombre = paciente ? paciente.nombre : 'N/A';
        html += `
          <tr>
            <td>${formatearFechaLarga(cita.fecha)}</td>
            <td>${cita.hora}</td>
            <td>${pacienteNombre}</td>
            <td>${cita.motivo}</td>
            <td><span class="badge ${estadoClase}">${cita.estado}</span></td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    html += '</div>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-contenido">
        <div class="modal-header">
          <h2>Agenda del Doctor</h2>
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
    mostrarAlerta(error.message || 'Error al cargar agenda', 'error');
  }
}

/**
 * Setup de eventos para doctores
 */
function setupEventosDoctores() {
  const formulario = document.getElementById('formularioDoctor');
  if (formulario) {
    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarDoctor();
    });
  }

  const filtro = document.getElementById('filtroEspecialidad');
  if (filtro) {
    filtro.addEventListener('change', (e) => {
      renderizarDoctores(e.target.value);
    });

    // Cargar opciones de especialidades
    filtro.innerHTML = '<option value="todas">Todas las especialidades</option>';
    especialidades.forEach(esp => {
      filtro.innerHTML += `<option value="${esp}">${esp}</option>`;
    });
  }
}
