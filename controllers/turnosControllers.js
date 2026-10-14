import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Paciente from "../models/paciente.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";

// Comprueba el formato del ID antes de cualquier consulta. Al devolver null
// después de responder 400, permite que el controlador termine sin continuar
// con una operación que no puede ser válida.
function idDeRuta(req, res) {
  const id = req.params.id;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ mensaje: "El ID del turno no es válido" });
    return null;
  }
  return id;
}

// Forma una fecha y hora local con precisión de minutos, que es el formato
// requerido por `datetime-local` y no incluye sufijo de zona horaria.
function formatearFechaLocal(fecha) {
  const completar = valor => String(valor).padStart(2, "0");
  return `${fecha.getFullYear()}-${completar(fecha.getMonth() + 1)}-${completar(fecha.getDate())}T${completar(fecha.getHours())}:${completar(fecha.getMinutes())}`;
}

// Convierte el valor guardado (que puede ser una fecha o una cadena) a Date y
// centraliza el formato que se usa al precargar el formulario.
function fechaParaFormulario(fecha) {
  return formatearFechaLocal(new Date(fecha));
}

// Los profesionales solo consultan turnos asociados a su propio perfil, usando
// el ID validado que quedó en sesión. El administrador obtiene un filtro vacío
// y por ello puede acceder a la colección completa.
function filtroTurnos(req) {
  return req.session.usuario.rol === "profesional"
    ? { profesional: req.session.usuario.profesionalId }
    : {};
}

// Normaliza las referencias recibidas, valida que estén completas y con formato
// correcto y confirma que paciente y especialidad existan. Busca el primer
// profesional asociado a esa especialidad, valida la fecha y calcula el fin a
// partir de la duración configurada en la especialidad. Devuelve un objeto de
// error en vez de datos si alguna regla de negocio no se cumple.
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

  // Estas lecturas son independientes: ejecutarlas en paralelo reduce la espera
  // sin cambiar el resultado de las validaciones.
  const [paciente, especialidad] = await Promise.all([
    Paciente.findById(pacienteId),
    Especialidad.findById(especialidadId)
  ]);
  if (!paciente) return { error: "Paciente no encontrado" };
  if (!especialidad) return { error: "Especialidad no encontrada" };

  // Selecciona de forma determinista el primer profesional de la especialidad
  // (orden de ObjectId) porque el formulario solo solicita la especialidad.
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

// Mantiene en un solo lugar la forma del documento persistido y permite que una
// actualización conserve el estado existente en vez de reiniciarlo a reservado.
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

// Prepara todos los datos requeridos por la plantilla: los turnos siempre están
// filtrados por rol y con referencias pobladas; las listas para crear/editar
// turnos solo se consultan para administradores, ya que el profesional no las usa.
async function renderizarListaTurnos(req, res, opciones = {}) {
  const esProfesional = req.session.usuario.rol === "profesional";
  const [turnos, pacientes, especialidades] = await Promise.all([
    Turno.find(filtroTurnos(req))
      .populate("paciente", "nombre apellido")
      .populate("profesional", "nombre apellido")
      .populate("especialidad", "nombre_especialidad")
      .sort({ fecha_hora_inicio: 1 }),
    esProfesional ? [] : Paciente.find().sort({ apellido: 1, nombre: 1 }),
    esProfesional ? [] : Especialidad.find().sort({ nombre_especialidad: 1 })
  ]);
  return res.render("listTurnos", {
    turnos,
    pacientes,
    especialidades,
    esProfesional,
    turno: null,
    mostrarFormulario: false,
    editando: false,
    ...opciones
  });
}

// Decide entre renderizar la página completa o devolver los registros como JSON.
// Ambas respuestas reutilizan el mismo filtro por rol para respetar el alcance
// de acceso del profesional también en consultas de API.
export async function obtenerTurnos(req, res) {
  if (req.headers.accept?.includes("text/html")) {
    return renderizarListaTurnos(req, res);
  }
  const turnos = await Turno.find(filtroTurnos(req)).sort({ fecha_hora_inicio: 1 });
  res.json(turnos);
}

// Combina el ID solicitado con el filtro del usuario en la consulta: un profesional
// no puede leer un turno ajeno aunque conozca su identificador. Si no hay una
// coincidencia visible, se responde 404.
export async function obtenerTurnoPorId(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const turno = await Turno.findOne({ _id: id, ...filtroTurnos(req) });
  if (!turno) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }
  res.json(turno);
}

// Aplica las validaciones y reglas de asignación compartidas antes de crear el
// turno. Un error de negocio produce 400; en caso de éxito, el navegador vuelve
// al listado y la API recibe el turno creado con estado HTTP 201.
export async function agregarTurno(req, res) {
  const datos = await obtenerDatosTurno(req.body);
  if ("error" in datos) {
    return res.status(400).json({ mensaje: datos.error });
  }
  // el estado inicial es "Reservado" y no se permite que el cliente lo cambie
  const turno = await Turno.create(datosTurno(datos));
  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/turnos");
  }
  res.status(201).json({ mensaje: "Turno agregado con éxito", turno });
}

// Verifica primero que el turno exista y luego valida los nuevos datos. Se
// conservan el estado y la integridad de las referencias al actualizar; los
// validadores de esquema se activan explícitamente para esta operación.
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

// Usa el mismo cargador de página que el listado, activando el modo de alta para
// incluir las opciones disponibles sin duplicar la lógica de consulta.
export async function mostrarFormularioNuevo(req, res) {
  return renderizarListaTurnos(req, res, { mostrarFormulario: true });
}

// Puebla las relaciones necesarias para la plantilla de edición. Si el turno
// apunta a un documento eliminado, responde conflicto (409) en vez de construir
// un formulario con datos incompletos; después adapta fecha e IDs al formato web.
export async function mostrarFormularioEdicion(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;
  // El filtro por rol se aplica para que un profesional no pueda editar un turno
  // ajeno aunque conozca su ID. Si no hay coincidencia, se responde 404.
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
  // Convierte la fecha a un formato compatible con el formulario y los IDs a cadenas
  const valoresTurno = turno.toObject();
  valoresTurno.fecha_hora_inicio = fechaParaFormulario(turno.fecha_hora_inicio);
  valoresTurno.pacienteId = turno.paciente._id.toString();
  valoresTurno.especialidadId = turno.especialidad._id.toString();
  return renderizarListaTurnos(req, res, {
    turno: valoresTurno,
    mostrarFormulario: true,
    editando: true
  });
}

// Valida el ID, borra el turno y responde 404 cuando no existe. La interfaz web
// usa una redirección para volver al listado; los clientes API reciben confirmación.
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
