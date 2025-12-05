// ==================== VALIDACIONES ====================

/**
 * Valida email con regex
 */
function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida teléfono (mínimo 10 dígitos)
 */
function validarTelefono(telefono) {
  const regex = /\d/g;
  const digitos = telefono.match(regex) || [];
  return digitos.length >= 10;
}

/**
 * Valida que la edad sea mayor a 0
 */
function validarEdad(edad) {
  return Number(edad) > 0;
}

/**
 * Valida formato de hora (HH:MM)
 */
function validarHora(hora) {
  const regex = /^\d{1,2}:\d{2}(?:\s?(AM|PM))?$/i;
  return regex.test(String(hora).trim());
}

/**
 * Intenta convertir una fecha en formatos comunes a ISO (YYYY-MM-DD).
 * Soporta: 'YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY'
 */
function parseDateToISO(fechaStr) {
  if (!fechaStr) return null;
  const s = String(fechaStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Convierte hora en formato 'HH:MM' o 'HH:MM AM/PM' a formato 24h 'HH:MM'.
 */
function parseTimeTo24(horaStr) {
  if (!horaStr) return null;
  let s = String(horaStr).trim();
  const ampmMatch = s.match(/\s?(AM|PM)$/i);
  if (ampmMatch) {
    const ampm = ampmMatch[1].toUpperCase();
    s = s.replace(/\s?(AM|PM)$/i, '').trim();
    const [h, m] = s.split(':').map(x => parseInt(x, 10));
    if (isNaN(h) || isNaN(m)) return null;
    let hh = h % 12;
    if (ampm === 'PM') hh += 12;
    return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  // ya en 24h
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':').map(x => parseInt(x, 10));
    if (isNaN(h) || isNaN(m)) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return null;
}

/**
 * Comprueba que la combinación fecha+hora represente un momento futuro respecto al cliente.
 * Acepta fechas en ISO o dd/MM/yyyy y horas en 24h o con AM/PM.
 */
function esFechaHoraFutura(fechaStr, horaStr) {
  const isoDate = parseDateToISO(fechaStr);
  if (!isoDate) return false;
  const time24 = parseTimeTo24(horaStr);
  if (!time24) return false;
  // Construir Date local
  const dt = new Date(`${isoDate}T${time24}:00`);
  if (isNaN(dt.getTime())) return false;
  return dt.getTime() > Date.now();
}

/**
 * Valida que la hora de inicio sea menor que la de fin
 */
function validarRangoHoras(inicio, fin) {
  return inicio < fin;
}

// ==================== MANIPULACIÓN DEL DOM ====================

/**
 * Muestra un mensaje de alerta
 */
function mostrarAlerta(mensaje, tipo = 'success') {
  const alertaDiv = document.createElement('div');
  alertaDiv.className = `alerta alerta-${tipo}`;
  alertaDiv.innerHTML = `
    <span>${mensaje}</span>
    <button class="btn-cerrar-alerta">×</button>
  `;
  
  document.body.appendChild(alertaDiv);
  
  // Auto-cerrar después de 5 segundos
  setTimeout(() => alertaDiv.remove(), 5000);
  
  // Cerrar al hacer click en el botón
  alertaDiv.querySelector('.btn-cerrar-alerta').addEventListener('click', () => {
    alertaDiv.remove();
  });
}

/**
 * Muestra un spinner de carga
 */
function mostrarCargando(elemento) {
  elemento.innerHTML = '<div class="spinner"></div>';
}

/**
 * Muestra mensaje de estado vacío
 */
function mostrarVacio(elemento, mensaje) {
  elemento.innerHTML = `<div class="empty-state"><p>${mensaje}</p></div>`;
}

/**
 * Muestra mensaje de error
 */
function mostrarError(elemento, mensaje) {
  elemento.innerHTML = `<div class="error-state"><p>❌ ${mensaje}</p></div>`;
}

/**
 * Limpia los errores de un formulario
 */
function limpiarErrores(formulario) {
  const errores = formulario.querySelectorAll('.error-message');
  errores.forEach(e => e.remove());
  const inputs = formulario.querySelectorAll('input, select, textarea');
  inputs.forEach(input => input.classList.remove('input-error'));
}

/**
 * Muestra error en un campo del formulario
 */
function mostrarErrorCampo(campo, mensaje) {
  campo.classList.add('input-error');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = mensaje;
  campo.parentNode.insertBefore(errorDiv, campo.nextSibling);
}

// ==================== UTILIDADES DE FECHA ====================

/**
 * Formatea una fecha a YYYY-MM-DD
 */
function formatearFecha(fecha) {
  // Asegurar parseo de YYYY-MM-DD como fecha local (no UTC) para evitar "día anterior" en zonas con offset
  const d = (function parseLocalDate(f) {
    if (!f) return new Date(NaN);
    const s = String(f);
    // si viene como ISO con tiempo, dejar que Date lo parsee
    if (s.includes('T')) return new Date(s);
    // intentar formatos YYYY-MM-DD o DD/MM/YYYY
    const iso = parseDateToISO(s);
    if (!iso) return new Date(s);
    const parts = iso.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  })(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Obtiene el nombre del día de la semana
 */
function obtenerDiaSemana(fecha) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const d = (function parseLocalDate(f) {
    if (!f) return new Date(NaN);
    const s = String(f);
    if (s.includes('T')) return new Date(s);
    const iso = parseDateToISO(s);
    if (!iso) return new Date(s);
    const parts = iso.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  })(fecha);
  return dias[d.getDay()];
}

/**
 * Formatea una fecha para mostrar (ej: 25 de Noviembre de 2025)
 */
function formatearFechaLarga(fecha) {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const d = (function parseLocalDate(f) {
    if (!f) return new Date(NaN);
    const s = String(f);
    if (s.includes('T')) return new Date(s);
    const iso = parseDateToISO(s);
    if (!iso) return new Date(s);
    const parts = iso.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  })(fecha);
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Verifica si una fecha es futura
 */
function esFechaFutura(fecha) {
  const iso = parseDateToISO(fecha);
  if (!iso) return false;
  const parts = iso.split('-');
  const fechaObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  fechaObj.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fechaObj >= hoy;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function obtenerFechaActual() {
  return formatearFecha(new Date());
}

// ==================== NAVEGACIÓN ====================

/**
 * Navega a una página
 */
function irA(pagina) {
  window.location.href = `pages/${pagina}`;
}

/**
 * Vuelve a la página anterior
 */
function volver() {
  window.history.back();
}

/**
 * Obtiene parámetro de URL
 */
function obtenerParametroURL(nombre) {
  const params = new URLSearchParams(window.location.search);
  return params.get(nombre);
}

// ==================== STORAGE ====================

/**
 * Guarda dato en localStorage
 */
function guardarStorage(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

/**
 * Obtiene dato de localStorage
 */
function obtenerStorage(clave) {
  const valor = localStorage.getItem(clave);
  return valor ? JSON.parse(valor) : null;
}

/**
 * Elimina dato de localStorage
 */
function eliminarStorage(clave) {
  localStorage.removeItem(clave);
}
