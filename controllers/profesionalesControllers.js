import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";

// Determina si la ruta debe responder con una página HTML o con JSON.
function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

// Valida el identificador del profesional antes de acceder a la base.
function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID del profesional no es válido" });
    return null;
  }
  return id;
}

// Filtra los datos recibidos para que solo se persistan campos del perfil profesional.
function datosProfesional(body) {
  const campos = [
    "nombre",
    "apellido",
    "matricula_profesional",
    "telefono",
    "correo_electronico"
  ];
  const datos = Object.fromEntries(
    campos.filter(campo => body[campo] !== undefined).map(campo => [campo, body[campo]])
  );

  if (body.especialidad !== undefined) {
    datos.especialidad = body.especialidad;
  }
  return datos;
}

// Verifica el formato y existencia de la especialidad asociada.
async function validarEspecialidad(idEspecialidad) {
  if (!mongoose.isObjectIdOrHexString(idEspecialidad)) {
    return false;
  }
  return Boolean(await Especialidad.exists({ _id: idEspecialidad }));
}

// Devuelve la lista de profesionales y, para el navegador, prepara el formulario de alta.
export async function obtenerProfesionales(req, res) {
  const profesionales = await Profesional.find()
    .populate("especialidad", "nombre_especialidad")
    .sort({ _id: 1 });
  if (solicitaHtml(req)) {
    const especialidades = await Especialidad.find().sort({ _id: 1 });
    return res.render("listProfesionales", {
      profesionales,
      especialidades,
      profesional: null,
      mostrarFormulario: false,
      editando: false
    });
  }
  res.json(profesionales);
}

// Carga los datos auxiliares y muestra vacío el formulario de creación.
export async function mostrarFormularioNuevo(_req, res) {
  const [profesionales, especialidades] = await Promise.all([
    Profesional.find().populate("especialidad", "nombre_especialidad").sort({ _id: 1 }),
    Especialidad.find().sort({ _id: 1 })
  ]);
  res.render("listProfesionales", {
    profesionales,
    especialidades,
    profesional: null,
    mostrarFormulario: true,
    editando: false
  });
}

// Busca un profesional y completa su referencia a especialidad antes de responder.
export async function obtenerProfesionalPorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const profesional = await Profesional.findById(id).populate("especialidad");
  if (!profesional) {
    return res.status(404).json({ mensaje: "Profesional no encontrado" });
  }
  res.json(profesional);
}

// Valida la especialidad y crea el perfil profesional.
export async function agregarProfesional(req, res) {
  const datos = datosProfesional(req.body);
  if (!(await validarEspecialidad(datos.especialidad))) {
    return res.status(400).json({ mensaje: "La especialidad no existe" });
  }

  const profesional = await Profesional.create(datos);
  if (solicitaHtml(req)) {
    return res.redirect("/profesionales");
  }
  res.status(201).json({ mensaje: "Profesional agregado con éxito", profesional });
}

// Obtiene el perfil, el listado y las especialidades para completar la edición.
export async function mostrarFormularioEdicion(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const [profesional, profesionales, especialidades] = await Promise.all([
    Profesional.findById(id).populate("especialidad"),
    Profesional.find().populate("especialidad", "nombre_especialidad").sort({ _id: 1 }),
    Especialidad.find().sort({ _id: 1 })
  ]);
  if (!profesional) {
    return res.status(404).send("Profesional no encontrado");
  }
  if (!profesional.especialidad) {
    return res.status(409).send("El profesional referencia una especialidad inexistente");
  }

  res.render("listProfesionales", {
    profesionales,
    profesional: {
      ...profesional.toObject(),
      especialidadId: profesional.especialidad._id.toString()
    },
    mostrarFormulario: true,
    editando: true,
    especialidades
  });
}

// Actualiza únicamente los campos permitidos y valida cualquier cambio de especialidad.
export async function actualizarProfesional(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const datos = datosProfesional(req.body);
  if (
    datos.especialidad !== undefined &&
    !(await validarEspecialidad(datos.especialidad))
  ) {
    return res.status(400).json({ mensaje: "La especialidad no existe" });
  }

  const profesional = await Profesional.findOneAndUpdate(
    { _id: id },
    { $set: datos },
    { new: true, runValidators: true }
  ).populate("especialidad", "nombre_especialidad");
  if (!profesional) {
    return res.status(404).json({ mensaje: "Profesional no encontrado" });
  }

  if (req.method === "POST" || solicitaHtml(req)) {
    return res.redirect("/profesionales");
  }
  res.json({ mensaje: "Profesional actualizado con éxito", profesional });
}

// Evita borrar profesionales con turnos asociados y elimina los perfiles sin referencias.
export async function eliminarProfesional(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  if (await Turno.exists({ profesional: id })) {
    return res.status(409).json({
      mensaje: "No se puede eliminar el profesional porque tiene turnos asociados"
    });
  }

  const profesional = await Profesional.findByIdAndDelete(id);
  if (!profesional) {
    return res.status(404).json({ mensaje: "Profesional no encontrado" });
  }

  if (req.method === "POST" || solicitaHtml(req)) {
    return res.redirect("/profesionales");
  }
  res.json({ mensaje: "Profesional eliminado con éxito" });
}
