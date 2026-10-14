import mongoose from "mongoose";
import Paciente from "../models/paciente.js";
import Turno from "../models/turno.js";

// Usa el tipo de contenido que acepta el cliente para decidir si el resultado
// debe ser una página HTML o datos JSON. Sin encabezado Accept se usa JSON.
function solicitaHtml(req) {
  return req.headers.accept?.includes("text/html") ?? false;
}

// Rechaza IDs mal formados antes de consultar MongoDB, con una respuesta 400
// explícita en vez de depender de un error de conversión del modelo.
function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID del paciente no es válido" });
    return null;
  }
  return id;
}

// Permite únicamente las propiedades reconocidas del paciente, evitando que
// campos adicionales enviados por el cliente modifiquen otros datos del modelo.
// Los campos omitidos se excluyen para que una actualización parcial los conserve.
function datosPaciente(body) {
  const campos = ["nombre", "apellido", "dni", "fecha_nacimiento", "telefono", "email"];
  return Object.fromEntries(
    campos.filter(campo => body[campo] !== undefined).map(campo => [campo, body[campo]])
  );
}

// El control `date` requiere `YYYY-MM-DD`. La conversión a ISO y el recorte
// eliminan la parte horaria que no forma parte de la fecha de nacimiento.
function fechaParaFormulario(fecha) {
  return fecha ? new Date(fecha).toISOString().slice(0, 10) : "";
}

// Ordena la colección una sola vez y reutiliza ese resultado para HTML o JSON;
// la vista recibe además los valores iniciales necesarios para el formulario.
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

// Carga el listado para mantener visible la tabla en la misma página que el
// formulario, y activa el estado de creación sin asociar un paciente existente.
export async function mostrarFormularioNuevo(_req, res) {
  const pacientes = await Paciente.find().sort({ _id: 1 });
  res.render("listPacientes", {
    pacientes,
    paciente: null,
    mostrarFormulario: true,
    editando: false
  });
}

// Valida primero el ID de ruta; una vez consultado, responde 404 si el paciente
// no existe o serializa el documento encontrado para el cliente de API.
export async function obtenerPacientePorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const paciente = await Paciente.findById(id);
  if (!paciente) {
    return res.status(404).json({ mensaje: "Paciente no encontrado" });
  }
  res.json(paciente);
}

// Construye el documento únicamente con campos permitidos. Los formularios
// vuelven al listado y las API reciben una confirmación y el nuevo documento.
export async function agregarPaciente(req, res) {
  const paciente = await Paciente.create(datosPaciente(req.body));

  if (solicitaHtml(req)) {
    return res.redirect("/pacientes");
  }
  res.status(201).json({ mensaje: "Paciente agregado con éxito", paciente });
}

// Obtiene en paralelo el registro que se editará y la colección para la tabla.
// La fecha se adapta al formato del control HTML y `toObject()` permite pasar a
// Pug un objeto plano con ese valor de presentación reemplazado.
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

// `$set` y el filtro de campos evitan sobrescribir propiedades no enviadas;
// `new` devuelve la versión guardada y `runValidators` mantiene las reglas del
// esquema. Se devuelve 404 si el ID válido ya no corresponde a un registro.
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

// Mantiene la integridad de los turnos existentes: si hay una referencia al
// paciente, informa conflicto (409); de lo contrario intenta borrarlo y responde
// 404 si no existía. Los formularios vuelven al listado y las API reciben JSON.
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
