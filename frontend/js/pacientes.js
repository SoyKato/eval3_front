// ==================== GESTIÓN DE PACIENTES ====================

let pacientes = [];
let editandoPaciente = null;

/**
 * Inicializa la página de pacientes
 */
async function inicializarPacientes() {
  await cargarPacientes();
  setupEventosPacientes();
  renderizarPacientes();
}

/**
 * Carga pacientes del servidor
 */
async function cargarPacientes() {
  try {
    mostrarCargando(document.getElementById('listaPacientes'));
    const resultado = await getPacientes();
    pacientes = resultado.data;
  } catch (error) {
    mostrarError(document.getElementById('listaPacientes'), 'Error al cargar pacientes');
    console.error(error);
  }
}

/**
 * Renderiza la lista de pacientes
 */
function renderizarPacientes() {
  const container = document.getElementById('listaPacientes');
  
  if (!pacientes || pacientes.length === 0) {
    mostrarVacio(container, 'No hay pacientes registrados. ¡Agrega el primero!');
    return;
  }

  let html = `
    <div class="tabla-responsive">
      <table class="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Edad</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  pacientes.forEach(paciente => {
    html += `
      <tr>
        <td>${paciente.id}</td>
        <td>${paciente.nombre}</td>
        <td>${paciente.edad}</td>
        <td>${paciente.telefono}</td>
        <td>${paciente.email}</td>
        <td>${formatearFechaLarga(paciente.fechaRegistro)}</td>
        <td class="acciones">
          <button class="btn-icon" onclick="verHistorialPaciente('${paciente.id}')" title="Ver historial">📋</button>
          <button class="btn-icon" onclick="editarPaciente('${paciente.id}')" title="Editar">✏️</button>
          <button class="btn-icon btn-cancelar" onclick="eliminarPaciente('${paciente.id}')" title="Borrar">🗑️</button>
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
 * Eliminar paciente
 */
async function eliminarPaciente(id) {
  const ok = confirm('¿Seguro que deseas eliminar este paciente? Sus citas programadas se cancelarán.');
  if (!ok) return;
  try {
    await deletePaciente(id);
    mostrarAlerta('Paciente eliminado', 'success');
    await cargarPacientes();
    renderizarPacientes();
  } catch (error) {
    mostrarAlerta(error.message || 'Error al eliminar paciente', 'error');
  }
}

/**
 * Abre el formulario para crear/editar paciente
 */
async function abrirFormularioPaciente(id = null) {
  editandoPaciente = id;
  const modal = document.getElementById('modalPaciente');
  const titulo = document.getElementById('tituloPaciente');
  const formulario = document.getElementById('formularioPaciente');

  limpiarErrores(formulario);

  if (id) {
    titulo.textContent = 'Editar Paciente';
    try {
      const resultado = await getPaciente(id);
      const paciente = resultado.data;
      document.getElementById('nombrePaciente').value = paciente.nombre;
      document.getElementById('edadPaciente').value = paciente.edad;
      document.getElementById('telefonoPaciente').value = paciente.telefono;
      document.getElementById('emailPaciente').value = paciente.email;
    } catch (error) {
      mostrarAlerta('Error al cargar paciente', 'error');
    }
  } else {
    titulo.textContent = 'Nuevo Paciente';
    formulario.reset();
  }

  modal.style.display = 'flex';
}

/**
 * Cierra el modal de paciente
 */
function cerrarModalPaciente() {
  document.getElementById('modalPaciente').style.display = 'none';
  document.getElementById('formularioPaciente').reset();
  limpiarErrores(document.getElementById('formularioPaciente'));
  editandoPaciente = null;
}

/**
 * Valida el formulario de paciente
 */
function validarFormularioPaciente() {
  limpiarErrores(document.getElementById('formularioPaciente'));
  const nombre = document.getElementById('nombrePaciente').value.trim();
  const edad = document.getElementById('edadPaciente').value;
  const telefono = document.getElementById('telefonoPaciente').value.trim();
  const email = document.getElementById('emailPaciente').value.trim();

  let valido = true;

  if (!nombre) {
    mostrarErrorCampo(document.getElementById('nombrePaciente'), 'El nombre es obligatorio');
    valido = false;
  }

  if (!edad || !validarEdad(edad)) {
    mostrarErrorCampo(document.getElementById('edadPaciente'), 'La edad debe ser mayor a 0');
    valido = false;
  }

  if (!validarTelefono(telefono)) {
    mostrarErrorCampo(document.getElementById('telefonoPaciente'), 'El teléfono debe tener al menos 10 dígitos');
    valido = false;
  }

  if (!email || !validarEmail(email)) {
    mostrarErrorCampo(document.getElementById('emailPaciente'), 'Email inválido');
    valido = false;
  }

  return valido;
}

/**
 * Guarda un paciente
 */
async function guardarPaciente() {
  if (!validarFormularioPaciente()) return;

  const datos = {
    nombre: document.getElementById('nombrePaciente').value.trim(),
    edad: document.getElementById('edadPaciente').value,
    telefono: document.getElementById('telefonoPaciente').value.trim(),
    email: document.getElementById('emailPaciente').value.trim()
  };

  try {
    const btnGuardar = document.querySelector('#modalPaciente .btn-guardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    if (editandoPaciente) {
      await updatePaciente(editandoPaciente, datos);
      mostrarAlerta('Paciente actualizado correctamente', 'success');
    } else {
      await createPaciente(datos);
      mostrarAlerta('Paciente registrado correctamente', 'success');
    }

    cerrarModalPaciente();
    await cargarPacientes();
    renderizarPacientes();
  } catch (error) {
    mostrarAlerta(error.message || 'Error al guardar paciente', 'error');
  }
}

/**
 * Edita un paciente
 */
async function editarPaciente(id) {
  await abrirFormularioPaciente(id);
}

/**
 * Ver historial de citas del paciente
 */
async function verHistorialPaciente(id) {
  try {
    const resultado = await getHistorialPaciente(id);
    const citas = resultado.data;
    const paciente = pacientes.find(p => p.id === id);

    let html = `
      <div class="historial-paciente">
        <div class="info-paciente">
          <h3>${paciente.nombre}</h3>
          <p><strong>ID:</strong> ${paciente.id}</p>
          <p><strong>Email:</strong> ${paciente.email}</p>
          <p><strong>Teléfono:</strong> ${paciente.telefono}</p>
        </div>
    `;

    if (citas.length === 0) {
      html += '<p class="sin-citas">Sin citas registradas</p>';
    } else {
      html += `
        <div class="tabla-responsive">
          <table class="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Doctor</th>
                <th>Especialidad</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
      `;

      citas.forEach(cita => {
        const doctor = cita.doctorNombre || 'N/A';
        const especialidad = cita.especialidad || 'N/A';
        const estadoClase = cita.estado === 'programada' ? 'estado-verde' : 'estado-rojo';
        html += `
          <tr>
            <td>${formatearFechaLarga(cita.fecha)}</td>
            <td>${cita.hora}</td>
            <td>${doctor}</td>
            <td>${especialidad}</td>
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
          <h2>Historial de Citas</h2>
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
    mostrarAlerta(error.message || 'Error al cargar historial', 'error');
  }
}

/**
 * Setup de eventos para pacientes
 */
function setupEventosPacientes() {
  const formulario = document.getElementById('formularioPaciente');
  if (formulario) {
    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      guardarPaciente();
    });
  }

  const buscador = document.getElementById('buscadorPacientes');
  if (buscador) {
    buscador.addEventListener('input', filtrarPacientes);
  }
}

/**
 * Filtra pacientes por búsqueda
 */
function filtrarPacientes(e) {
  const termino = e.target.value.toLowerCase();
  const pacientesFiltra = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(termino) || p.id.includes(termino)
  );

  const container = document.getElementById('listaPacientes');
  if (pacientesFiltra.length === 0) {
    mostrarVacio(container, 'No se encontraron pacientes');
    return;
  }

  let html = `
    <div class="tabla-responsive">
      <table class="tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Edad</th>
            <th>Teléfono</th>
            <th>Email</th>
            <th>Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  pacientesFiltra.forEach(paciente => {
    html += `
      <tr>
        <td>${paciente.id}</td>
        <td>${paciente.nombre}</td>
        <td>${paciente.edad}</td>
        <td>${paciente.telefono}</td>
        <td>${paciente.email}</td>
        <td>${formatearFechaLarga(paciente.fechaRegistro)}</td>
        <td class="acciones">
          <button class="btn-icon" onclick="verHistorialPaciente('${paciente.id}')" title="Ver historial">📋</button>
          <button class="btn-icon" onclick="editarPaciente('${paciente.id}')" title="Editar">✏️</button>
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
