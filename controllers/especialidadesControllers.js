import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";

// Determina si la solicitud espera una página del navegador en vez de datos JSON.
function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

// Valida el identificador de especialidad recibido en la URL.
function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID de la especialidad no es válido" });
    return null;
  }
  return id;
}

// Da formato local a la fecha para usarla en un control datetime-local.
function formatearFechaLocal(fecha) {
  const completar = valor => String(valor).padStart(2, "0");
  return `${fecha.getFullYear()}-${completar(fecha.getMonth() + 1)}-${completar(fecha.getDate())}T${completar(fecha.getHours())}:${completar(fecha.getMinutes())}`;
}

// Convierte y selecciona los campos de entrada que forman una especialidad.
function datosEspecialidad(body) {
  return {
    nombre_especialidad: body.nombre_especialidad,
    descripcion: body.descripcion,
    duracion_turno_default: Number(body.duracion_turno_default)
  };
}

// Carga el listado y combina sus valores iniciales con las opciones de vista solicitadas.
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

// Lista especialidades en HTML o JSON según el tipo de cliente.
export async function obtenerEspecialidades(req, res) {
  if (solicitaHtml(req)) {
    return renderizarLista(res);
  }
  res.json(await Especialidad.find().sort({ nombre_especialidad: 1 }));
}

// Muestra el formulario de alta junto a las especialidades existentes.
export async function mostrarFormularioNuevo(_req, res) {
  return renderizarLista(res, { mostrarFormulario: true });
}

// Busca una especialidad por su identificador y responde con el documento encontrado.
export async function obtenerEspecialidadPorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const especialidad = await Especialidad.findById(id);
  if (!especialidad) {
    return res.status(404).json({ mensaje: "Especialidad no encontrada" });
  }
  res.json(especialidad);
}

// Crea una especialidad con los campos normalizados y responde al navegador o a la API.
export async function crearEspecialidad(req, res) {
  const especialidad = await Especialidad.create(datosEspecialidad(req.body));
  if (solicitaHtml(req)) {
    return res.redirect("/especialidades");
  }
  res.status(201).json(especialidad);
}

// Carga una especialidad para mostrar sus valores en el formulario de edición.
export async function mostrarFormularioEditar(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const especialidad = await Especialidad.findById(id);
  if (!especialidad) {
    return res.status(404).send("Especialidad no encontrada");
  }

  return renderizarLista(res, { especialidad, mostrarFormulario: true, editando: true });
}

// Actualiza los campos de una especialidad y valida el documento resultante.
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

// Conserva especialidades referenciadas por profesionales o turnos y elimina las demás.
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
