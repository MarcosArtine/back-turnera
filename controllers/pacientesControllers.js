import mongoose from "mongoose";
import Paciente from "../models/paciente.js";
import Turno from "../models/turno.js";

function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID del paciente no es válido" });
    return null;
  }
  return id;
}

function datosPaciente(body) {
  const campos = ["nombre", "apellido", "dni", "fecha_nacimiento", "telefono", "email"];
  return Object.fromEntries(
    campos.filter(campo => body[campo] !== undefined).map(campo => [campo, body[campo]])
  );
}

function fechaParaFormulario(fecha) {
  return fecha ? new Date(fecha).toISOString().slice(0, 10) : "";
}

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

export async function mostrarFormularioNuevo(_req, res) {
  const pacientes = await Paciente.find().sort({ _id: 1 });
  res.render("listPacientes", {
    pacientes,
    paciente: null,
    mostrarFormulario: true,
    editando: false
  });
}

export async function obtenerPacientePorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const paciente = await Paciente.findById(id);
  if (!paciente) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }
  res.json(paciente);
}

export async function agregarPaciente(req, res) {
  const paciente = await Paciente.create(datosPaciente(req.body));

  if (solicitaHtml(req)) {
    return res.redirect("/pacientes");
  }
  res.status(201).json({ mensaje: "Paciente agregado con éxito", paciente });
}

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
