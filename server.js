import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readData, writeData } from "./utils/fileManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Rutas de los archivos JSON
const DATA_DIR = path.join(__dirname, "data");
const PACIENTES_FILE = path.join(DATA_DIR, "pacientes.json");
const DOCTORES_FILE = path.join(DATA_DIR, "doctores.json");
const CITAS_FILE = path.join(DATA_DIR, "citas.json");

// Helpers simples
const generarId = (prefijo, lista) => `${prefijo}${String(lista.length + 1).padStart(3, "0")}`;

const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const horaValida = (hora) => /^\d{2}:\d{2}$/.test(hora);

// ==================== PACIENTES ====================

// Listar pacientes
app.get("/pacientes", (req, res) => {
  const pacientes = readData(PACIENTES_FILE);
  res.json({ success: true, data: pacientes });
});

// Obtener paciente por id
app.get("/pacientes/:id", (req, res) => {
  const pacientes = readData(PACIENTES_FILE);
  const paciente = pacientes.find(p => p.id === req.params.id);
  if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });
  res.json({ success: true, data: paciente });
});

// Crear paciente
app.post("/pacientes", (req, res) => {
  const { nombre, edad, telefono, email } = req.body;
  if (!nombre || !email || !telefono || typeof edad === "undefined") {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios: nombre, edad, telefono, email" });
  }
  if (Number(edad) <= 0) return res.status(400).json({ success: false, message: "Edad debe ser mayor a 0" });

  const pacientes = readData(PACIENTES_FILE);
  if (pacientes.some(p => p.email === email)) {
    return res.status(400).json({ success: false, message: "El email ya está registrado" });
  }

  const nuevo = {
    id: generarId("P", pacientes),
    nombre,
    edad: Number(edad),
    telefono,
    email,
    fechaRegistro: new Date().toISOString().split("T")[0]
  };

  pacientes.push(nuevo);
  writeData(PACIENTES_FILE, pacientes);
  res.status(201).json({ success: true, data: nuevo });
});

// Actualizar paciente
app.put("/pacientes/:id", (req, res) => {
  const { nombre, edad, telefono, email } = req.body;
  const pacientes = readData(PACIENTES_FILE);
  const index = pacientes.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Paciente no encontrado" });

  if (email && pacientes.some((p, i) => p.email === email && i !== index)) {
    return res.status(400).json({ success: false, message: "El email ya está registrado" });
  }
  if (edad !== undefined && Number(edad) <= 0) return res.status(400).json({ success: false, message: "Edad debe ser mayor a 0" });

  if (nombre) pacientes[index].nombre = nombre;
  if (edad !== undefined) pacientes[index].edad = Number(edad);
  if (telefono) pacientes[index].telefono = telefono;
  if (email) pacientes[index].email = email;

  writeData(PACIENTES_FILE, pacientes);
  res.json({ success: true, data: pacientes[index] });
});

// Historial de citas de paciente
app.get("/pacientes/:id/historial", (req, res) => {
  const pacientes = readData(PACIENTES_FILE);
  const paciente = pacientes.find(p => p.id === req.params.id);
  if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });

  const citas = readData(CITAS_FILE);
  const historial = citas.filter(c => c.pacienteId === req.params.id);
  res.json({ success: true, data: historial });
});

// ==================== DOCTORES ====================

// Listar doctores
app.get("/doctores", (req, res) => {
  const doctores = readData(DOCTORES_FILE);
  res.json({ success: true, data: doctores });
});

// Obtener doctor por id
app.get("/doctores/:id", (req, res) => {
  const doctores = readData(DOCTORES_FILE);
  const doctor = doctores.find(d => d.id === req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor no encontrado" });
  res.json({ success: true, data: doctor });
});

// Buscar por especialidad
app.get("/doctores/especialidad/:especialidad", (req, res) => {
  const doctores = readData(DOCTORES_FILE);
  const encontrados = doctores.filter(d => d.especialidad.toLowerCase() === req.params.especialidad.toLowerCase());
  res.json({ success: true, data: encontrados });
});

// Doctores disponibles para fecha y hora
app.get("/doctores/disponibles", (req, res) => {
  const { fecha, hora } = req.query;
  if (!fecha || !hora) return res.status(400).json({ success: false, message: "Parámetros requeridos: fecha, hora" });
  if (!horaValida(hora)) return res.status(400).json({ success: false, message: "Formato de hora inválido (HH:MM)" });

  const doctores = readData(DOCTORES_FILE);
  const citas = readData(CITAS_FILE);

  const dia = diasSemana[new Date(fecha).getDay()];
  const disponibles = doctores.filter(d => {
    if (!d.diasDisponibles || !d.diasDisponibles.length) return false;
    if (!d.diasDisponibles.includes(dia)) return false;

    // horario object handling
    const inicio = d.horarioInicio ?? (d.horario && d.horario.inicio) ?? null;
    const fin = d.horarioFin ?? (d.horario && d.horario.fin) ?? null;
    if (!inicio || !fin) return false;
    if (hora < inicio || hora > fin) return false;
    // revisar conflictos
    const conflicto = citas.some(c => c.doctorId === d.id && c.fecha === fecha && c.hora === hora && c.estado === "programada");
    return !conflicto;
  });

  res.json({ success: true, data: disponibles });
});

// Crear doctor
app.post("/doctores", (req, res) => {
  const { nombre, especialidad, horarioInicio, horarioFin, diasDisponibles } = req.body;
  if (!nombre || !especialidad || !horarioInicio || !horarioFin || !diasDisponibles) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
  }
  if (!horaValida(horarioInicio) || !horaValida(horarioFin)) {
    return res.status(400).json({ success: false, message: "Formato de hora inválido (HH:MM)" });
  }
  if (horarioInicio >= horarioFin) {
    return res.status(400).json({ success: false, message: "Horario inicio debe ser menor que horario fin" });
  }
  if (!Array.isArray(diasDisponibles) || diasDisponibles.length === 0) {
    return res.status(400).json({ success: false, message: "diasDisponibles no puede estar vacío" });
  }

  const doctores = readData(DOCTORES_FILE);
  if (doctores.some(d => d.nombre === nombre && d.especialidad === especialidad)) {
    return res.status(400).json({ success: false, message: "Ya existe un doctor con ese nombre y especialidad" });
  }

  const nuevo = {
    id: generarId("D", doctores),
    nombre,
    especialidad,
    horarioInicio,
    horarioFin,
    diasDisponibles
  };

  doctores.push(nuevo);
  writeData(DOCTORES_FILE, doctores);
  res.status(201).json({ success: true, data: nuevo });
});

// ==================== CITAS ====================

// Listar citas (fecha, estado)
app.get("/citas", (req, res) => {
  const { fecha, estado } = req.query;
  let citas = readData(CITAS_FILE);
  if (fecha) citas = citas.filter(c => c.fecha === fecha);
  if (estado) citas = citas.filter(c => c.estado === estado);
  res.json({ success: true, data: citas });
});

// Obtener cita por id
app.get("/citas/:id", (req, res) => {
  const citas = readData(CITAS_FILE);
  const cita = citas.find(c => c.id === req.params.id);
  if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });
  res.json({ success: true, data: cita });
});

// Agendar cita
app.post("/citas", (req, res) => {
  const { pacienteId, doctorId, fecha, hora, motivo } = req.body;
  if (!pacienteId || !doctorId || !fecha || !hora) {
    return res.status(400).json({ success: false, message: "Faltan datos de la cita: pacienteId, doctorId, fecha, hora" });
  }
  if (!horaValida(hora)) return res.status(400).json({ success: false, message: "Formato de hora inválido (HH:MM)" });

  const pacientes = readData(PACIENTES_FILE);
  const doctores = readData(DOCTORES_FILE);
  const citas = readData(CITAS_FILE);

  const paciente = pacientes.find(p => p.id === pacienteId);
  if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });

  const doctor = doctores.find(d => d.id === doctorId);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor no encontrado" });

  // Fecha futura
  const fechaCita = new Date(`${fecha}T00:00:00`);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  if (isNaN(fechaCita.getTime()) || fechaCita < hoy) {
    return res.status(400).json({ success: false, message: "La fecha debe ser hoy o futura (YYYY-MM-DD)" });
  }

  // Verificar dia disponible
  const dia = diasSemana[new Date(fecha).getDay()];
  if (!doctor.diasDisponibles || !doctor.diasDisponibles.includes(dia)) {
    return res.status(400).json({ success: false, message: `Doctor no atiende los ${dia}s` });
  }

  // Verificar horario
  const inicio = doctor.horarioInicio ?? (doctor.horario && doctor.horario.inicio) ?? null;
  const fin = doctor.horarioFin ?? (doctor.horario && doctor.horario.fin) ?? null;
  if (!inicio || !fin) return res.status(400).json({ success: false, message: "Doctor no tiene horario válido" });
  if (hora < inicio || hora > fin) {
    return res.status(400).json({ success: false, message: `Hora fuera del horario del doctor (${inicio} - ${fin})` });
  }

  // Verificar conflicto
  if (citas.some(c => c.doctorId === doctorId && c.fecha === fecha && c.hora === hora && c.estado === "programada")) {
    return res.status(400).json({ success: false, message: "El doctor ya tiene una cita a esa hora" });
  }

  const nueva = {
    id: generarId("C", citas),
    pacienteId,
    doctorId,
    fecha,
    hora,
    motivo: motivo || "",
    estado: "programada",
    fechaCreacion: new Date().toISOString()
  };

  citas.push(nueva);
  writeData(CITAS_FILE, citas);
  res.status(201).json({ success: true, data: nueva });
});

// Cancelar cita
app.put("/citas/:id/cancelar", (req, res) => {
  const citas = readData(CITAS_FILE);
  const index = citas.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Cita no encontrada" });
  if (citas[index].estado !== "programada") {
    return res.status(400).json({ success: false, message: "Solo se pueden cancelar citas programadas" });
  }
  citas[index].estado = "cancelada";
  writeData(CITAS_FILE, citas);
  res.json({ success: true, data: citas[index] });
});

// Agenda de un doctor
app.get("/citas/doctor/:doctorId", (req, res) => {
  const doctores = readData(DOCTORES_FILE);
  if (!doctores.find(d => d.id === req.params.doctorId)) {
    return res.status(404).json({ success: false, message: "Doctor no encontrado" });
  }
  const citas = readData(CITAS_FILE);
  const agenda = citas.filter(c => c.doctorId === req.params.doctorId && c.estado === "programada");
  res.json({ success: true, data: agenda });
});

// ==================== ESTADISTICAS ====================

// Doctor con mas citas
app.get("/estadisticas/doctores", (req, res) => {
  const doctores = readData(DOCTORES_FILE);
  const citas = readData(CITAS_FILE);
  const conteo = {};
  for (const c of citas) {
    conteo[c.doctorId] = (conteo[c.doctorId] || 0) + 1;
  }
  const mejorId = Object.keys(conteo).reduce((a,b) => (conteo[a]||0) > (conteo[b]||0) ? a : b, null);
  const doctor = mejorId ? doctores.find(d => d.id === mejorId) : null;
  res.json({ success: true, data: { doctor, totalCitas: conteo[mejorId] || 0 } });
});

// Especialidad mas solicitada
app.get("/estadisticas/especialidades", (req, res) => {
  const doctores = readData(DOCTORES_FILE);
  const citas = readData(CITAS_FILE);
  const conteo = {};
  for (const c of citas) {
    const doc = doctores.find(d => d.id === c.doctorId);
    if (!doc) continue;
    conteo[doc.especialidad] = (conteo[doc.especialidad] || 0) + 1;
  }
  res.json({ success: true, data: conteo });
});

// Citas proximas
app.get("/citas/proximas", (req, res) => {
  const horas = Number(req.query.horas) || 24;
  const citas = readData(CITAS_FILE);
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + horas * 60 * 60 * 1000);
  const proximas = citas.filter(c => {
    const dt = new Date(`${c.fecha}T${c.hora}`);
    return c.estado === "programada" && dt >= ahora && dt <= limite;
  });
  res.json({ success: true, data: proximas });
});

// Manejo rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada" });
});

// Inicio servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ejecutandose en http://localhost:${PORT}`));
