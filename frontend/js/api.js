// ==================== CONFIGURACIÓN API ====================
const API_URL = 'http://localhost:3000';

// ==================== UTILIDADES ====================

async function parseError(response, fallback) {
  const text = await response.text();
  if (text) {
    try {
      const error = JSON.parse(text);
      const msg = error && (error.message || error.error || (error.data && error.data.message));
      return msg || text.trim() || fallback;
    } catch (_) {
      return text.trim() || fallback;
    }
  }
  return fallback;
}

/**
 * Realiza una petición GET a la API
 * @param {string} endpoint - Ruta del endpoint
 * @returns {Promise<{success: boolean, data: any}>}
 */
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) {
      const msg = await parseError(response, 'Error en la petición');
      throw new Error(msg);
    }
    return await response.json();
  } catch (error) {
    console.error('Error en GET:', error);
    throw error;
  }
}

/**
 * Realiza una petición POST a la API
 * @param {string} endpoint - Ruta del endpoint
 * @param {object} data - Datos a enviar
 * @returns {Promise<{success: boolean, data: any}>}
 */
async function postData(endpoint, data) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const msg = await parseError(response, 'Error al crear');
      throw new Error(msg);
    }
    return await response.json();
  } catch (error) {
    console.error('Error en POST:', error);
    throw error;
  }
}

/**
 * Realiza una petición PUT a la API
 * @param {string} endpoint - Ruta del endpoint
 * @param {object} data - Datos a actualizar
 * @returns {Promise<{success: boolean, data: any}>}
 */
async function putData(endpoint, data) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const msg = await parseError(response, 'Error al actualizar');
      throw new Error(msg);
    }
    return await response.json();
  } catch (error) {
    console.error('Error en PUT:', error);
    throw error;
  }
}

/**
 * Realiza una petición DELETE a la API
 */
async function deleteData(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE' });
    if (!response.ok) {
      const msg = await parseError(response, 'Error al eliminar');
      throw new Error(msg);
    }
    const isNoContent = response.status === 204 || response.headers.get('content-length') === '0';
    if (isNoContent) return { success: true };
    try {
      return await response.json();
    } catch (_) {
      return { success: true };
    }
  } catch (error) {
    console.error('Error en DELETE:', error);
    throw error;
  }
}

// ==================== PACIENTES ====================

/**
 * Obtiene lista de todos los pacientes
 */
async function getPacientes() {
  return fetchData('/pacientes');
}

/**
 * Obtiene un paciente por ID
 */
async function getPaciente(id) {
  return fetchData(`/pacientes/${id}`);
}

async function deletePaciente(id) {
  return deleteData(`/pacientes/${id}`);
}

/**
 * Crea un nuevo paciente
 */
async function createPaciente(data) {
  return postData('/pacientes', data);
}

/**
 * Actualiza un paciente
 */
async function updatePaciente(id, data) {
  return putData(`/pacientes/${id}`, data);
}

/**
 * Obtiene historial de citas de un paciente
 */
async function getHistorialPaciente(id) {
  return fetchData(`/pacientes/${id}/historial`);
}

// ==================== DOCTORES ====================

/**
 * Obtiene lista de todos los doctores
 */
async function getDoctores() {
  return fetchData('/doctores');
}

/**
 * Obtiene un doctor por ID
 */
async function getDoctor(id) {
  return fetchData(`/doctores/${id}`);
}

async function deleteDoctor(id) {
  return deleteData(`/doctores/${id}`);
}

/**
 * Obtiene doctores por especialidad
 */
async function getDoctoresPorEspecialidad(especialidad) {
  return fetchData(`/doctores/especialidad/${especialidad}`);
}

/**
 * Obtiene doctores disponibles para fecha y hora
 */
async function getDoctoresDisponibles(fecha, hora) {
  return fetchData(`/doctores/disponibles?fecha=${fecha}&hora=${hora}`);
}

/**
 * Crea un nuevo doctor
 */
async function createDoctor(data) {
  return postData('/doctores', data);
}

/**
 * Actualiza un doctor
 */
async function updateDoctor(id, data) {
  return putData(`/doctores/${id}`, data);
}

// ==================== CITAS ====================

/**
 * Obtiene lista de citas próximas (últimas 24 horas)
 */
async function getCitasProximas(horas = 24) {
  return fetchData(`/citas/proximas?horas=${horas}`);
}

/**
 * Obtiene lista de citas con filtros opcionales
 */
async function getCitas(fecha = null, estado = null) {
  let endpoint = '/citas';
  const params = new URLSearchParams();
  if (fecha) params.append('fecha', fecha);
  if (estado) params.append('estado', estado);
  if (params.toString()) endpoint += `?${params.toString()}`;
  return fetchData(endpoint);
}

/**
 * Obtiene una cita por ID
 */
async function getCita(id) {
  return fetchData(`/citas/${id}`);
}

/**
 * Obtiene agenda de un doctor
 */
async function getAgendaDoctor(doctorId) {
  return fetchData(`/citas/doctor/${doctorId}`);
}

/**
 * Crea una nueva cita
 */
async function createCita(data) {
  return postData('/citas', data);
}

/**
 * Cancela una cita
 */
async function cancelarCita(id) {
  return putData(`/citas/${id}/cancelar`, {});
}

async function deleteCita(id) {
  return deleteData(`/citas/${id}`);
}

// ==================== ESTADÍSTICAS ====================

/**
 * Obtiene doctor con más citas
 */
async function getEstadisticasDoctores() {
  return fetchData('/estadisticas/doctores');
}

/**
 * Obtiene especialidades más solicitadas
 */
async function getEstadisticasEspecialidades() {
  return fetchData('/estadisticas/especialidades');
}
