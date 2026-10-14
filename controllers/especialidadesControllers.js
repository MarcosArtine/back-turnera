import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";

// Inspecciona Accept para reutilizar los controladores desde la interfaz web y
// desde clientes de API. Si el encabezado no existe, el comportamiento es JSON.
function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

// Valida antes de consultar MongoDB para responder con un 400 claro, en vez de
// dejar que un identificador mal formado se convierta en un error de Mongoose.
function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID de la especialidad no es válido" });
    return null;
  }
  return id;
}

// Construye el formato local que espera `datetime-local` (sin zona horaria ni
// segundos); se usa para evitar valores que el navegador no pueda mostrar.
function formatearFechaLocal(fecha) {
  const completar = valor => String(valor).padStart(2, "0");
  return `${fecha.getFullYear()}-${completar(fecha.getMonth() + 1)}-${completar(fecha.getDate())}T${completar(fecha.getHours())}:${completar(fecha.getMinutes())}`;
}

// Crea una lista explícita de propiedades persistibles y convierte la duración
// a número para que Mongoose reciba el tipo esperado por el modelo.
function datosEspecialidad(body) {
  return {
    nombre_especialidad: body.nombre_especialidad,
    descripcion: body.descripcion,
    duracion_turno_default: Number(body.duracion_turno_default)
  };
}

// Comparte el armado de la página de listado entre los flujos normal, alta y
// edición. Los valores predeterminados mantienen la vista consistente y las
// opciones al final permiten reemplazarlos solo para el caso que las necesite.
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

// Para el navegador renderiza la plantilla reutilizando el helper; para una API
// devuelve la misma colección ordenada como JSON, sin cargar datos de vista.
export async function obtenerEspecialidades(req, res) {
  if (solicitaHtml(req)) {
    return renderizarLista(res);
  }
  res.json(await Especialidad.find().sort({ nombre_especialidad: 1 }));
}

// El formulario de alta comparte la lista actual y activa el estado de creación,
// por lo que no se duplica aquí la consulta ni la configuración de la vista.
export async function mostrarFormularioNuevo(_req, res) {
  return renderizarLista(res, { mostrarFormulario: true });
}

// Primero valida el ID y luego distingue entre un documento inexistente (404)
// y uno encontrado, que se entrega como JSON para este endpoint de consulta.
export async function obtenerEspecialidadPorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const especialidad = await Especialidad.findById(id);
  if (!especialidad) {
    return res.status(404).json({ mensaje: "Especialidad no encontrada" });
  }
  res.json(especialidad);
}

// Normaliza los campos antes de crear el documento. Las solicitudes del
// navegador vuelven al listado; las solicitudes de API reciben el documento
// recién creado con el código HTTP 201.
export async function crearEspecialidad(req, res) {
  const especialidad = await Especialidad.create(datosEspecialidad(req.body));
  if (solicitaHtml(req)) {
    return res.redirect("/especialidades");
  }
  res.status(201).json(especialidad);
}

// Comprueba el identificador y que el registro exista antes de reutilizar la
// vista de listado con el formulario precargado en modo edición.
export async function mostrarFormularioEditar(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const especialidad = await Especialidad.findById(id);
  if (!especialidad) {
    return res.status(404).send("Especialidad no encontrada");
  }

  return renderizarLista(res, { especialidad, mostrarFormulario: true, editando: true });
}

// `$set` limita la actualización a los campos preparados por el helper;
// `new` devuelve la versión actualizada y `runValidators` aplica las reglas del
// esquema también en operaciones de actualización.
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

// Comprueba en paralelo las dos relaciones que impedirían borrar la especialidad.
// El 409 protege la integridad referencial; solo si está libre se intenta borrar,
// lo que además permite diferenciar un ID válido pero inexistente (404).
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
