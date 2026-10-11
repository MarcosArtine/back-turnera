import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";

function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID de la especialidad no es válido" });
    return null;
  }
  return id;
}

function datosEspecialidad(body) {
  return {
    nombre_especialidad: body.nombre_especialidad,
    descripcion: body.descripcion,
    duracion_turno_default: Number(body.duracion_turno_default)
  };
}

async function renderizarLista(res, opciones = {}) {
  const especialidades = await Especialidad.find().sort({ nombre_especialidad: 1 });
  return res.render("listEspecialidades", {
    especialidades,
    especialidad: null,
    mostrarFormulario: false,
    editando: false,
    ...opciones
  });
}

export async function obtenerEspecialidades(req, res) {
  if (solicitaHtml(req)) {
    return renderizarLista(res);
  }
  res.json(await Especialidad.find().sort({ nombre_especialidad: 1 }));
}

export async function mostrarFormularioNuevo(_req, res) {
  return renderizarLista(res, { mostrarFormulario: true });
}

export async function obtenerEspecialidadPorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const especialidad = await Especialidad.findById(id);
  if (!especialidad) {
    return res.status(404).json({ mensaje: "Especialidad no encontrada" });
  }
  res.json(especialidad);
}

export async function crearEspecialidad(req, res) {
  const especialidad = await Especialidad.create(datosEspecialidad(req.body));
  if (solicitaHtml(req)) {
    return res.redirect("/especialidades");
  }
  res.status(201).json(especialidad);
}

export async function mostrarFormularioEditar(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const especialidad = await Especialidad.findById(id);
  if (!especialidad) {
    return res.status(404).send("Especialidad no encontrada");
  }

  return renderizarLista(res, { especialidad, mostrarFormulario: true, editando: true });
}

export async function actualizarEspecialidad(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const especialidad = await Especialidad.findByIdAndUpdate(
    id,
    { $set: datosEspecialidad(req.body) },
    { new: true, runValidators: true }
  );
  if (!especialidad) {
    return res.status(404).json({ mensaje: "Especialidad no encontrada" });
  }

  if (req.method === "POST" || solicitaHtml(req)) {
    return res.redirect("/especialidades");
  }
  res.json(especialidad);
}

export async function eliminarEspecialidad(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const [tieneProfesionales, tieneTurnos] = await Promise.all([
    Profesional.exists({ especialidad: id }),
    Turno.exists({ especialidad: id })
  ]);
  if (tieneProfesionales || tieneTurnos) {
    return res.status(409).json({
      mensaje: "No se puede eliminar la especialidad porque tiene profesionales o turnos asociados"
    });
  }

  const especialidad = await Especialidad.findByIdAndDelete(id);
  if (!especialidad) {
    return res.status(404).json({ mensaje: "Especialidad no encontrada" });
  }

  if (req.method === "POST" || solicitaHtml(req)) {
    return res.redirect("/especialidades");
  }
  res.status(204).send();
}
