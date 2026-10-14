import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";

// Consulta el encabezado Accept para compartir los endpoints entre la interfaz
// web y clientes de API. Si no se solicita HTML, se responde con JSON.
function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

// Evita lanzar consultas con un ObjectId inválido y entrega un error 400
// controlado; el valor se devuelve sin modificar si es válido.
function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID del profesional no es válido" });
    return null;
  }
  return id;
}

// Crea un objeto de persistencia con una lista permitida de datos del perfil.
// Solo copia campos presentes, así las actualizaciones parciales no borran los
// valores existentes; especialidad se agrega de forma explícita como referencia.
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

// Comprueba primero el formato de la referencia y luego su existencia. Devuelve
// un booleano para que alta y edición apliquen la misma regla de integridad.
async function validarEspecialidad(idEspecialidad) {
  if (!mongoose.isObjectIdOrHexString(idEspecialidad)) {
    return false;
  }
  return Boolean(await Especialidad.exists({ _id: idEspecialidad }));
}

// Carga profesionales con el nombre de su especialidad para evitar mostrar solo
// el ObjectId. HTML también necesita la lista de opciones del formulario; las
// solicitudes JSON reciben los profesionales poblados, sin datos de presentación.
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

// Consulta en paralelo la tabla y las especialidades disponibles, ya que ambas
// colecciones son independientes y se necesitan para renderizar la página de alta.
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

// Rechaza IDs mal formados, luego completa la referencia de especialidad para
// entregar información útil en JSON y devuelve 404 si el perfil no existe.
export async function obtenerProfesionalPorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const profesional = await Profesional.findById(id).populate("especialidad");
  if (!profesional) {
    return res.status(404).json({ mensaje: "Profesional no encontrado" });
  }
  res.json(profesional);
}

// Filtra primero los campos de entrada y exige una especialidad existente antes
// de insertar. Así el profesional no puede quedar asociado a una referencia rota.
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

// Recupera en paralelo el perfil objetivo, la tabla y las opciones del selector.
// Comprueba que las referencias pobladas existan antes de pasar sus valores a la
// vista; una relación rota se informa como conflicto (409).
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

// Solo valida la referencia si el cliente incluyó un cambio de especialidad;
// una actualización de otros campos conserva la asociación actual. Los
// validadores de esquema se ejecutan también en la actualización de MongoDB.
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

// No permite eliminar un perfil que tenga turnos asociados. Si no hay referencias,
// borra el documento; distingue el caso de registro inexistente y adapta la
// respuesta entre redirección para el navegador y JSON para la API.
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
