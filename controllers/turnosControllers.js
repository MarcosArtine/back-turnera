import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { formatInTimeZone } from "date-fns-tz";
import BloqueoAgenda from "../models/bloqueoAgenda.js";
import Especialidad from "../models/especialidad.js";
import Paciente from "../models/paciente.js";
import Profesional from "../models/profesional.js";
import Turno from "../models/turno.js";
import {
  dentroHorarioLaboral,
  fechaParaFormulario,
  parsearFechaHoraLocal,
  ZONA_HORARIA_AGENDA
} from "../utils/agenda.js";

const DURACION_BLOQUEO_MS = 2 * 60 * 1000;
const ESPERA_MAXIMA_BLOQUEO_MS = 10 * 1000;

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

function clavesDeAgenda(turno) {
  return [
    `paciente:${turno.paciente.toString()}`,
    `profesional:${turno.profesional.toString()}`
  ];
}

async function adquirirBloqueosAgenda(claves) {
  const titular = randomUUID();
  const adquiridas = [];
  const limite = Date.now() + ESPERA_MAXIMA_BLOQUEO_MS;

  async function liberar() {
    await Promise.all(adquiridas.map(clave =>
      BloqueoAgenda.updateOne(
        { _id: clave, titular },
        { $set: { vence_en: new Date(0) } }
      )
    ));
  }

  for (const clave of [...new Set(claves)].sort()) {
    let adquirida = false;
    while (!adquirida) {
      try {
        const bloqueo = await BloqueoAgenda.findOneAndUpdate(
          { _id: clave, vence_en: { $lte: new Date() } },
          {
            $set: {
              titular,
              vence_en: new Date(Date.now() + DURACION_BLOQUEO_MS)
            }
          },
          { new: true, upsert: true }
        );
        adquirida = Boolean(bloqueo);
      } catch (error) {
        if (error.code !== 11000) {
          await liberar();
          throw error;
        }
      }

      if (adquirida) {
        adquiridas.push(clave);
      } else if (Date.now() >= limite) {
        await liberar();
        return null;
      } else {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  return liberar;
}

async function existeSuperposicion(datos, excluirId) {
  return Turno.exists({
    estado: "Reservado",
    fecha_hora_inicio: { $lt: datos.fecha_hora_fin },
    fecha_hora_fin: { $gt: datos.fecha_hora_inicio },
    $or: [
      { profesional: datos.profesional },
      { paciente: datos.paciente }
    ],
    ...(excluirId ? { _id: { $ne: excluirId } } : {})
  });
}

// Los profesionales solo consultan turnos asociados a su propio perfil, usando
// el ID validado que quedó en el JWT. El administrador obtiene un filtro vacío
// y por ello puede acceder a la colección completa.
function filtroTurnos(req) {
  return req.usuario.rol === "profesional"
    ? { profesional: req.usuario.profesionalId }
    : {};
}

// Normaliza las referencias, valida que el profesional corresponda a la
// especialidad seleccionada y calcula el intervalo en la zona horaria del centro.
// Devuelve un error de validación en vez de datos cuando falta una regla.
async function obtenerDatosTurno(body) {
  const pacienteId = String(body.paciente ?? "").trim();
  const especialidadId = String(body.especialidad ?? "").trim();
  const profesionalId = String(body.profesional ?? "").trim();
  const fechaInicio = body.fecha_hora_inicio ?? body.fechaHora;

  if (!pacienteId || !especialidadId || !profesionalId || typeof fechaInicio !== "string") {
    return { error: "Selecciona paciente, especialidad, profesional y fecha para el turno" };
  }
  if (
    !mongoose.isObjectIdOrHexString(pacienteId) ||
    !mongoose.isObjectIdOrHexString(especialidadId) ||
    !mongoose.isObjectIdOrHexString(profesionalId)
  ) {
    return { error: "El paciente, la especialidad o el profesional seleccionados no son válidos" };
  }

  const [paciente, especialidad, profesional] = await Promise.all([
    Paciente.findById(pacienteId),
    Especialidad.findById(especialidadId),
    Profesional.findOne({ _id: profesionalId, especialidad: especialidadId })
  ]);
  if (!paciente) return { error: "Paciente no encontrado" };
  if (!especialidad) return { error: "Especialidad no encontrada" };
  if (!profesional) {
    return { error: "El profesional seleccionado no pertenece a esa especialidad" };
  }

  const inicio = parsearFechaHoraLocal(fechaInicio);
  if (!inicio) {
    return { error: "La fecha y hora de inicio no son válidas" };
  }

  const fin = new Date(inicio.getTime() + especialidad.duracion_turno_default * 60_000);
  if (!dentroHorarioLaboral(inicio, fin)) {
    return { error: "Los turnos deben ser de lunes a viernes y finalizar antes de las 17:00 (hora de Buenos Aires)" };
  }

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
  const esProfesional = req.usuario.rol === "profesional";
  const [turnos, pacientes, especialidades, profesionales] = await Promise.all([
    Turno.find(filtroTurnos(req))
      .populate("paciente", "nombre apellido")
      .populate("profesional", "nombre apellido")
      .populate("especialidad", "nombre_especialidad")
      .sort({ fecha_hora_inicio: 1 }),
    esProfesional ? [] : Paciente.find().sort({ apellido: 1, nombre: 1 }),
    esProfesional ? [] : Especialidad.find().sort({ nombre_especialidad: 1 }),
    esProfesional
      ? []
      : Profesional.find()
        .populate("especialidad", "nombre_especialidad")
        .sort({ apellido: 1, nombre: 1 })
  ]);
  return res.render("listTurnos", {
    turnos,
    pacientes,
    especialidades,
    profesionales,
    formatearFecha: fecha => formatInTimeZone(
      new Date(fecha),
      ZONA_HORARIA_AGENDA,
      "dd/MM/yyyy HH:mm"
    ),
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
  const nuevoTurno = datosTurno(datos);
  const liberar = await adquirirBloqueosAgenda(clavesDeAgenda(nuevoTurno));
  if (!liberar) {
    return res.status(503).json({ mensaje: "La agenda está ocupada. Intenta nuevamente." });
  }
  try {
    if (await existeSuperposicion(nuevoTurno)) {
      return res.status(409).json({
        mensaje: "El paciente o el profesional ya tiene un turno reservado en ese horario"
      });
    }
    const turno = await Turno.create(nuevoTurno);
    if (req.headers.accept?.includes("text/html")) {
      return res.redirect("/turnos");
    }
    return res.status(201).json({ mensaje: "Turno agregado con éxito", turno });
  } finally {
    await liberar();
  }
}

// Verifica primero que el turno exista y luego valida los nuevos datos. Se
// conservan el estado y la integridad de las referencias al actualizar; los
// validadores de esquema se activan explícitamente para esta operación.
export async function actualizarTurno(req, res) {
  const id = idDeRuta(req, res);
  if (id === null) return;

  const datos = await obtenerDatosTurno(req.body);
  if ("error" in datos) {
    return res.status(400).json({ mensaje: datos.error });
  }

  for (let intento = 0; intento < 3; intento++) {
    const turnoExistente = await Turno.findById(id);
    if (!turnoExistente) {
      return res.status(404).json({ mensaje: "Turno no encontrado" });
    }

    const turnoActualizado = datosTurno(datos, turnoExistente.estado);
    const claves = [...clavesDeAgenda(turnoExistente), ...clavesDeAgenda(turnoActualizado)];
    const liberar = await adquirirBloqueosAgenda(claves);
    if (!liberar) {
      return res.status(503).json({ mensaje: "La agenda está ocupada. Intenta nuevamente." });
    }

    try {
      const actual = await Turno.findById(id);
      if (!actual) {
        return res.status(404).json({ mensaje: "Turno no encontrado" });
      }
      const clavesActuales = clavesDeAgenda(actual);
      if (!clavesActuales.every(clave => claves.includes(clave))) {
        continue;
      }

      const datosActualizados = datosTurno(datos, actual.estado);
      if (
        datosActualizados.estado === "Reservado" &&
        await existeSuperposicion(datosActualizados, id)
      ) {
        return res.status(409).json({
          mensaje: "El paciente o el profesional ya tiene un turno reservado en ese horario"
        });
      }

      const turno = await Turno.findByIdAndUpdate(
        id,
        { $set: datosActualizados },
        { new: true, runValidators: true }
      );
      if (req.method === "POST" || req.headers.accept?.includes("text/html")) {
        return res.redirect("/turnos");
      }
      return res.json({ mensaje: "Turno actualizado con éxito", turno });
    } finally {
      await liberar();
    }
  }
  return res.status(503).json({
    mensaje: "El turno cambió mientras se editaba. Vuelve a intentarlo."
  });
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
  valoresTurno.profesionalId = turno.profesional._id.toString();
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

  for (let intento = 0; intento < 3; intento++) {
    const existente = await Turno.findById(id);
    if (!existente) {
      return res.status(404).json({ mensaje: "Turno no encontrado" });
    }
    const claves = clavesDeAgenda(existente);
    const liberar = await adquirirBloqueosAgenda(claves);
    if (!liberar) {
      return res.status(503).json({ mensaje: "La agenda está ocupada. Intenta nuevamente." });
    }

    try {
      const actual = await Turno.findById(id);
      if (!actual) {
        return res.status(404).json({ mensaje: "Turno no encontrado" });
      }
      if (!clavesDeAgenda(actual).every(clave => claves.includes(clave))) {
        continue;
      }
      await Turno.findByIdAndDelete(id);
      if (req.method === "POST" || req.headers.accept?.includes("text/html")) {
        return res.redirect("/turnos");
      }
      return res.json({ mensaje: "Turno eliminado con éxito" });
    } finally {
      await liberar();
    }
  }
  return res.status(503).json({
    mensaje: "El turno cambió mientras se eliminaba. Vuelve a intentarlo."
  });
}
