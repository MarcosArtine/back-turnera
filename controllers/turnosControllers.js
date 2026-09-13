const fs = require("fs"); // Importar el módulo fs para leer y escribir archivos
const path = require("path"); // Importar el módulo path para manejar rutas de archivos

// Apuntamos a la base de datos JSON
const rutaDatabase = path.join(__dirname, "../data/turnos.json");
const rutaPacientes = path.join(__dirname, "../data/pacientes.json");
const rutaProfesionales = path.join(__dirname, "../data/profesionales.json");
const rutaEspecialidades = path.join(__dirname, "../data/especialidades.json");


//función para leer los turnos desde el archivo database.json
function leerTurnos() {
  const Data = fs.readFileSync(rutaDatabase, "utf-8"); // Leer el contenido del archivo database.json
  return JSON.parse(Data)
}

//funcion para guardar los turnos en el archivo database.json
function guardarTurnos(turnos) {
  const Data = JSON.stringify(turnos, null, 2);
  fs.writeFileSync(rutaDatabase, Data, "utf-8");
}

function leerJson(ruta) {
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatearFechaLocal(fecha) {
  const completar = valor => String(valor).padStart(2, "0");
  return `${fecha.getFullYear()}-${completar(fecha.getMonth() + 1)}-${completar(fecha.getDate())}T${completar(fecha.getHours())}:${completar(fecha.getMinutes())}:00`;
}


//GET -> obtener todos los turnos
const obtenerTurnos = (req, res) => {
  const turnos = leerTurnos();
  res.json(turnos);
}


// GET -> obtener un turno por ID
const obtenerTurnoPorId = (req, res) => {
  const id = parseInt(req.params.id);
  const turnos = leerTurnos();
  const turnoEncontrado = turnos.find(t => t.id_turno === id);

  if (!turnoEncontrado) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }
  res.status(200).json(turnoEncontrado); //no hace falta el status(200) porque viene por default, pero lo dejo para que quede más claro que es un GET exitoso
};


// POST -> agregar un nuevo turno
const agregarTurno = (req, res) => {
  const turnos = leerTurnos();
  const { nombrePaciente, apellidoPaciente, especialidad, fechaHora, fecha_hora_inicio } = req.body;
  const pacientes = leerJson(rutaPacientes);
  const profesionales = leerJson(rutaProfesionales);
  const especialidades = leerJson(rutaEspecialidades);
  const paciente = pacientes.find(paciente =>
    normalizarTexto(paciente.nombre) === normalizarTexto(nombrePaciente) &&
    normalizarTexto(paciente.apellido) === normalizarTexto(apellidoPaciente)
  );
  const especialidadEncontrada = especialidades.find(item =>
    normalizarTexto(item.nombre_especialidad) === normalizarTexto(especialidad)
  );

  if (!paciente) {
    return res.status(400).json({ mensaje: "Paciente no encontrado" });
  }
  if (!especialidadEncontrada) {
    return res.status(400).json({ mensaje: "Especialidad no encontrada" });
  }

  const profesional = profesionales.find(item => item.id_especialidad === especialidadEncontrada.id_especialidad);
  if (!profesional) {
    return res.status(400).json({ mensaje: "No hay un profesional para esa especialidad" });
  }

  const inicio = new Date(fecha_hora_inicio || fechaHora);
  if (!Number.isFinite(inicio.getTime())) {
    return res.status(400).json({ mensaje: "La fecha y hora de inicio no son válidas" });
  }
  const fin = new Date(inicio.getTime() + especialidadEncontrada.duracion_turno_default * 60 * 1000);
  const siguienteId = turnos.reduce((mayor, turno) => Math.max(mayor, Number(turno.id_turno) || 0), 0) + 1;
  const nuevoTurno = {
    id_turno: siguienteId,
    id_paciente: paciente.id_paciente,
    id_profesional: profesional.id_profesional,
    nombrePaciente: paciente.nombre,
    apellidoPaciente: paciente.apellido,
    especialidad: especialidadEncontrada.nombre_especialidad,
    fecha_hora_inicio: formatearFechaLocal(inicio),
    fecha_hora_fin: formatearFechaLocal(fin),
    estado: "Reservado"
  };

  turnos.push(nuevoTurno);
  guardarTurnos(turnos);
  res.status(201).json({
    mensaje: "Turno agregado con éxito",
    turno: nuevoTurno
  });
}

// PUT -> actualizar un turno existente
const actualizarTurno = (req, res) => {
  const id = parseInt(req.params.id);
  const turnos = leerTurnos();
  const turnoIndex = turnos.findIndex(t => t.id_turno === id);

  // Verificamos si el turno existe
  if (turnoIndex === -1) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  // Actualizamos los datos del turno
  turnos[turnoIndex] = { ...turnos[turnoIndex], ...req.body };

  guardarTurnos(turnos);
  res.status(200).json({
    mensaje: "Turno actualizado con éxito",
    turno: turnos[turnoIndex]
  }); // Devuelve un mensaje de éxito (denuevo no hace falta el status(200)) y el turno actualizado
};


// DELETE -> eliminar un turno existente
const eliminarTurno = (req, res) => {
  const id = parseInt(req.params.id);
  const turnos = leerTurnos();
  const turnoIndex = turnos.findIndex(t => t.id_turno === id);

  // Verificamos si el turno existe
  if (turnoIndex === -1) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  // Eliminamos el turno de la lista
  turnos.splice(turnoIndex, 1);
  guardarTurnos(turnos);
  res.json({ mensaje: "Turno eliminado con éxito" });
}

// Exportamos las funciones para que puedan ser utilizadas en otros archivos
module.exports = {
  leerTurnos,
  obtenerTurnos,
  obtenerTurnoPorId,
  agregarTurno,
  actualizarTurno,
  eliminarTurno
};