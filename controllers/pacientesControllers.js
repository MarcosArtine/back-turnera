import mongoose from "mongoose";
import Paciente from "../models/paciente.js";
import Turno from "../models/turno.js";

// Detecta solicitudes de navegador para elegir entre vistas HTML y respuestas JSON.
function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

// Comprueba el ObjectId de la URL antes de consultar MongoDB.
function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID del paciente no es válido" });
    return null;
  }
  return id;
}

// Extrae solo los campos permitidos para crear o modificar un paciente.
function datosPaciente(body) {
  const campos = ["nombre", "apellido", "dni", "fecha_nacimiento", "telefono", "email"];
  return Object.fromEntries(
    campos.filter(campo => body[campo] !== undefined).map(campo => [campo, body[campo]])
  );
}

// Formatea la fecha de nacimiento para el control HTML de tipo date.
function fechaParaFormulario(fecha) {
  return fecha ? new Date(fecha).toISOString().slice(0, 10) : "";
}

// Obtiene todos los pacientes y responde con una vista o un arreglo JSON.
export async function obtenerPacientes(req, res) {
  const pacientes = await Paciente.find().sort({ _id: 1 });
  if (solicitaHtml(req)) {
    return res.render("listPacientes", {
      pacientes,
      paciente: null,
      mostrarFormulario: false,
      editando: false
    });
  }
  res.json(pacientes);
}

// Muestra el formulario de alta junto al listado actual de pacientes.
export async function mostrarFormularioNuevo(_req, res) {
  const pacientes = await Paciente.find().sort({ _id: 1 });
  res.render("listPacientes", {
    pacientes,
    paciente: null,
    mostrarFormulario: true,
    editando: false
  });
}

// Busca un paciente por ID y devuelve un error si no existe.
export async function obtenerPacientePorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const paciente = await Paciente.findById(id);
  if (!paciente) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }
  res.json(paciente);
}

// Crea un paciente con los campos permitidos y adapta la respuesta al cliente.
export async function agregarPaciente(req, res) {
  const paciente = await Paciente.create(datosPaciente(req.body));

  if (solicitaHtml(req)) {
    return res.redirect("/pacientes");
  }
  res.status(201).json({ mensaje: "Paciente agregado con éxito", paciente });
}

// Carga los datos del paciente y prepara la fecha para editarla desde la vista.
export async function mostrarFormularioEdicion(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const [paciente, pacientes] = await Promise.all([
    Paciente.findById(id),
    Paciente.find().sort({ _id: 1 })
  ]);
  if (!paciente) {
    return res.status(404).send("Paciente no encontrado");
  }

  res.render("listPacientes", {
    pacientes,
    paciente: { ...paciente.toObject(), fecha_nacimiento: fechaParaFormulario(paciente.fecha_nacimiento) },
    mostrarFormulario: true,
    editando: true
  });
}

// Aplica los cambios permitidos y responde con redirección web o el documento actualizado.
export async function editarPaciente(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const paciente = await Paciente.findOneAndUpdate(
    { _id: id },
    { $set: datosPaciente(req.body) },
    { new: true, runValidators: true }
  );
  if (!paciente) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }

  if (req.method === "POST" || solicitaHtml(req)) {
    return res.redirect("/pacientes");
  }
  res.json({ mensaje: "Paciente actualizado con éxito", paciente });
}

// Impide eliminar pacientes asociados a turnos y borra solo registros sin referencias.
export async function eliminarPaciente(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  if (await Turno.exists({ paciente: id })) {
    return res.status(409).json({
      mensaje: "No se puede eliminar el paciente porque tiene turnos asociados"
    });
  }

  const paciente = await Paciente.findByIdAndDelete(id);
  if (!paciente) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }

  if (req.method === "POST" || solicitaHtml(req)) {
    return res.redirect("/pacientes");
  }
  res.json({ mensaje: "Paciente eliminado con éxito" });
}
