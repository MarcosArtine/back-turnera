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

// Función para normalizar texto eliminando acentos y convirtiendo a minúsculas
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

function obtenerDatosTurno(req) {
  const { nombrePaciente, apellidoPaciente, especialidad, fechaHora, fecha_hora_inicio } = req.body;
  const pacientes = leerJson(rutaPacientes);
  const profesionales = leerJson(rutaProfesionales);
  const especialidades = leerJson(rutaEspecialidades);
  const paciente = pacientes.find(item =>
    normalizarTexto(item.nombre) === normalizarTexto(nombrePaciente) &&
    normalizarTexto(item.apellido) === normalizarTexto(apellidoPaciente)
  );
  const especialidadEncontrada = especialidades.find(item =>
    normalizarTexto(item.nombre_especialidad) === normalizarTexto(especialidad)
  );

  if (!paciente) return { error: "Paciente no encontrado" };
  if (!especialidadEncontrada) return { error: "Especialidad no encontrada" };

  const profesional = profesionales.find(item => item.id_especialidad === especialidadEncontrada.id_especialidad);
  if (!profesional) return { error: "No hay un profesional para esa especialidad" };

  const inicio = new Date(fecha_hora_inicio || fechaHora);
  if (!Number.isFinite(inicio.getTime())) return { error: "La fecha y hora de inicio no son válidas" };

  const fin = new Date(inicio.getTime() + especialidadEncontrada.duracion_turno_default * 60 * 1000);
  return {
    paciente,
    profesional,
    especialidad: especialidadEncontrada,
    fecha_hora_inicio: formatearFechaLocal(inicio),
    fecha_hora_fin: formatearFechaLocal(fin)
  };
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
  const datos = obtenerDatosTurno(req);

  if (datos.error) {
    return res.status(400).json({ mensaje: datos.error });
  }

  const siguienteId = turnos.reduce((mayor, turno) => Math.max(mayor, Number(turno.id_turno) || 0), 0) + 1;
  const nuevoTurno = {
    id_turno: siguienteId,
    id_paciente: datos.paciente.id_paciente,
    id_profesional: datos.profesional.id_profesional,
    nombrePaciente: datos.paciente.nombre,
    apellidoPaciente: datos.paciente.apellido,
    especialidad: datos.especialidad.nombre_especialidad,
    fecha_hora_inicio: datos.fecha_hora_inicio,
    fecha_hora_fin: datos.fecha_hora_fin,
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

  // Obtenemos los datos del turno desde la solicitud
  const datos = obtenerDatosTurno(req);
  if (datos.error) {
    return res.status(400).json({ mensaje: datos.error });
  }

  // Actualizamos los datos del turno existente con los nuevos datos proporcionados
  turnos[turnoIndex] = {
    ...turnos[turnoIndex],
    id_paciente: datos.paciente.id_paciente,
    id_profesional: datos.profesional.id_profesional,
    nombrePaciente: datos.paciente.nombre,
    apellidoPaciente: datos.paciente.apellido,
    especialidad: datos.especialidad.nombre_especialidad,
    fecha_hora_inicio: datos.fecha_hora_inicio,
    fecha_hora_fin: datos.fecha_hora_fin
  };

  guardarTurnos(turnos);
  if (req.method === "POST") {
    return res.redirect("/");
  }

  res.status(200).json({
    mensaje: "Turno actualizado con éxito",
    turno: turnos[turnoIndex]
  }); // Devuelve un mensaje de éxito (denuevo no hace falta el status(200)) y el turno actualizado
};


// GET -> mostrar el formulario de edición de un turno
const mostrarFormularioNuevo = (req, res) => {
  res.render("formTurnos", {
    title: "Nuevo Turno",
    message: "Complete el formulario para crear un nuevo turno.",
    turno: null,
    editando: false,
    especialidades: leerJson(rutaEspecialidades)
  });
};

const mostrarFormularioEdicion = (req, res) => {
  const id = parseInt(req.params.id);
  const turno = leerTurnos().find(item => item.id_turno === id);
  if (!turno) return res.status(404).send("Turno no encontrado");

  res.render("formTurnos", {
    title: "Editar Turno",
    message: "Modifique los datos del turno.",
    turno,
    editando: true,
    especialidades: leerJson(rutaEspecialidades)
  });
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

  // Si la solicitud es un POST, redirigimos a la página principal
  if (req.method === "POST") {
    return res.redirect("/");
  }

  res.json({ mensaje: "Turno eliminado con éxito" });
}

// Exportamos las funciones para que puedan ser utilizadas en otros archivos
module.exports = {
  leerTurnos,
  mostrarFormularioNuevo,
  mostrarFormularioEdicion,
  obtenerTurnos,
  obtenerTurnoPorId,
  agregarTurno,
  actualizarTurno,
  eliminarTurno
};