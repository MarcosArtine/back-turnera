const fs = require("fs");
const path = require("path");

const rutaPacientes = path.join(__dirname, "../data/pacientes.json");
function leerPacientes() {
  return JSON.parse(fs.readFileSync(rutaPacientes, "utf-8"));
}

function guardarPacientes(pacientes) {
  fs.writeFileSync(rutaPacientes, JSON.stringify(pacientes, null, 2), "utf-8");
}

function siguienteId(registros, campo) {
  return registros.reduce(
    (mayor, registro) => Math.max(mayor, Number(registro[campo]) || 0),
    0
  ) + 1;
}

function obtenerPacientes(req, res) {
  res.render("listPacientes", { pacientes : leerPacientes() });
}

function mostrarFormularioNuevo(req, res) {
  res.render("formPacientes", { paciente: null, editando: false });
}

function obtenerPacientePorId(req, res) {
  const id = parseInt(req.params.id, 10);
  const paciente = leerPacientes().find(item => item.id_paciente === id);

  if (!paciente) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }

  res.json(paciente);
}

function agregarPaciente(req, res) {
  const pacientes = leerPacientes();
  const { nombre, apellido, dni, fecha_nacimiento, telefono, email } = req.body;

  const nuevoPaciente = {
    id_paciente: siguienteId(pacientes, "id_paciente"),
    nombre,
    apellido,
    dni,
    fecha_nacimiento,
    telefono,
    email
  };

  pacientes.push(nuevoPaciente);
  guardarPacientes(pacientes);

  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    return res.redirect("/pacientes");
  }

  res.status(201).json({ mensaje: "Paciente agregado con éxito", paciente: nuevoPaciente });
}

function mostrarFormularioEdicion(req, res) {
  const id = parseInt(req.params.id, 10);
  const paciente = leerPacientes().find(item => item.id_paciente === id);

  if (!paciente) {
    return res.status(404).send("Paciente no encontrado");
  }

  res.render("formPacientes", { paciente, editando: true });
}

// Función para editar un paciente existente
function editarPaciente(req, res) {
  const id = parseInt(req.params.id, 10);
  const pacientes = leerPacientes();
  const pacienteIndex = pacientes.findIndex(item => item.id_paciente === id);

  if (pacienteIndex === -1) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }

  const { nombre, apellido, dni, fecha_nacimiento, telefono, email } = req.body;
  pacientes[pacienteIndex] = {
    ...pacientes[pacienteIndex],
    nombre,
    apellido,
    dni,
    fecha_nacimiento,
    telefono,
    email
  };
  guardarPacientes(pacientes);

  if (req.method === "POST") {
    return res.redirect("/pacientes");
  }

  res.json({ mensaje: "Paciente actualizado con éxito", paciente: pacientes[pacienteIndex] });
}

// Función para eliminar un paciente existente
function eliminarPaciente(req, res) {
  const id = parseInt(req.params.id, 10);
  const pacientes = leerPacientes();
  const pacienteIndex = pacientes.findIndex(item => item.id_paciente === id);

  if (pacienteIndex === -1) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }

  pacientes.splice(pacienteIndex, 1);
  guardarPacientes(pacientes);

  if (req.method === "POST") {
    return res.redirect("/pacientes");
  }

  res.json({ mensaje: "Paciente eliminado con éxito" });
}

module.exports = {
  leerPacientes,
  obtenerPacientes,
  mostrarFormularioNuevo,
  obtenerPacientePorId,
  agregarPaciente,
  mostrarFormularioEdicion,
  editarPaciente,
  eliminarPaciente
};
