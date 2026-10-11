import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Paciente from "../models/paciente.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";

function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID del turno no es válido" });
    return null;
  }
  return id;
}

function formatearFechaLocal(fecha) {
  const completar = valor => String(valor).padStart(2, "0");
  return `${fecha.getFullYear()}-${completar(fecha.getMonth() + 1)}-${completar(fecha.getDate())}T${completar(fecha.getHours())}:${completar(fecha.getMinutes())}`;
}

function fechaParaFormulario(fecha) {
  return formatearFechaLocal(new Date(fecha));
}

async function obtenerDatosTurno(body) {
  const pacienteId = String(body.paciente ?? "").trim();
  const especialidadId = String(body.especialidad ?? "").trim();
  const fechaInicio = body.fecha_hora_inicio ?? body.fechaHora;

  if (!pacienteId || !especialidadId || !fechaInicio) {
    return { error: "Faltan datos requeridos para el turno" };
  }
  if (
    !mongoose.isObjectIdOrHexString(pacienteId) ||
    !mongoose.isObjectIdOrHexString(especialidadId)
  ) {
    return { error: "El paciente o la especialidad seleccionados no son válidos" };
  }

  const [paciente, especialidad] = await Promise.all([
    Paciente.findById(pacienteId),
    Especialidad.findById(especialidadId)
  ]);
  if (!paciente) return { error: "Paciente no encontrado" };
  if (!especialidad) return { error: "Especialidad no encontrada" };

  const profesional = await Profesional.findOne({
    especialidad: especialidad._id
  }).sort({ _id: 1 });
  if (!profesional) {
    return { error: "No hay un profesional para esa especialidad" };
  }

  const inicio = new Date(fechaInicio);
  if (!Number.isFinite(inicio.getTime())) {
    return { error: "La fecha y hora de inicio no son válidas" };
  }

  const fin = new Date(inicio.getTime() + especialidad.duracion_turno_default * 60_000);
  return {
    paciente,
    profesional,
    especialidad,
    fecha_hora_inicio: inicio,
    fecha_hora_fin: fin
  };
}

function datosTurno(datos, estado = "Reservado") {
  return {
    paciente: datos.paciente._id,
    profesional: datos.profesional._id,
    especialidad: datos.especialidad._id,
    fecha_hora_inicio: datos.fecha_hora_inicio,
    fecha_hora_fin: datos.fecha_hora_fin,
    estado
  };
}

async function renderizarListaTurnos(res, opciones = {}) {
  const [turnos, pacientes, especialidades] = await Promise.all([
    Turno.find()
      .populate("paciente", "nombre apellido")
      .populate("profesional", "nombre apellido")
      .populate("especialidad", "nombre_especialidad")
      .sort({ fecha_hora_inicio: 1 }),
    Paciente.find().sort({ apellido: 1, nombre: 1 }),
    Especialidad.find().sort({ nombre_especialidad: 1 })
  ]);
  return res.render("listTurnos", {
    turnos,
    pacientes,
    especialidades,
    turno: null,
    mostrarFormulario: false,
    editando: false,
    ...opciones
  });
}

export async function obtenerTurnos(req, res) {
  if (req.headers.accept?.includes("text/html")) {
    return renderizarListaTurnos(res);
  }
  const turnos = await Turno.find().sort({ fecha_hora_inicio: 1 });
  res.json(turnos);
}

export async function obtenerTurnoPorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const turno = await Turno.findById(id);
  if (!turno) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }
  res.json(turno);
}

export async function agregarTurno(req, res) {
  const datos = await obtenerDatosTurno(req.body);
  if ("error" in datos) {
    return res.status(400).json({ mensaje: datos.error });
  }

  const turno = await Turno.create(datosTurno(datos));
  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/turnos");
  }
  res.status(201).json({ mensaje: "Turno agregado con éxito", turno });
}

export async function actualizarTurno(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const turnoExistente = await Turno.findById(id);
  if (!turnoExistente) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  const datos = await obtenerDatosTurno(req.body);
  if ("error" in datos) {
    return res.status(400).json({ mensaje: datos.error });
  }

  const turno = await Turno.findByIdAndUpdate(
    id,
    { $set: datosTurno(datos, turnoExistente.estado) },
    { new: true, runValidators: true }
  );

  if (req.method === "POST" || req.headers.accept?.includes("text/html")) {
    return res.redirect("/turnos");
  }
  res.json({ mensaje: "Turno actualizado con éxito", turno });
}

export async function mostrarFormularioNuevo(_req, res) {
  return renderizarListaTurnos(res, { mostrarFormulario: true });
}

export async function mostrarFormularioEdicion(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const turno = await Turno.findById(id)
    .populate("paciente")
    .populate("profesional")
    .populate("especialidad");
  if (!turno) {
    return res.status(404).send("Turno no encontrado");
  }
  if (!turno.paciente || !turno.profesional || !turno.especialidad) {
    return res.status(409).send("El turno referencia un documento inexistente");
  }

  const valoresTurno = turno.toObject();
  valoresTurno.fecha_hora_inicio = fechaParaFormulario(turno.fecha_hora_inicio);
  valoresTurno.pacienteId = turno.paciente._id.toString();
  valoresTurno.especialidadId = turno.especialidad._id.toString();
  return renderizarListaTurnos(res, {
    turno: valoresTurno,
    mostrarFormulario: true,
    editando: true
  });
}

export async function eliminarTurno(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const turno = await Turno.findByIdAndDelete(id);
  if (!turno) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  if (req.method === "POST" || req.headers.accept?.includes("text/html")) {
    return res.redirect("/turnos");
  }
  res.json({ mensaje: "Turno eliminado con éxito" });
}
