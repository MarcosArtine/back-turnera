const fs = require("fs");
const path = require("path");

const rutaProfesionales = path.join(__dirname, "../data/profesionales.json");
const rutaEspecialidades = path.join(__dirname, "../data/especialidades.json");
function leerProfesionales() {
  return JSON.parse(fs.readFileSync(rutaProfesionales, "utf-8"));
}

function guardarProfesionales(profesionales) {
  fs.writeFileSync(rutaProfesionales, JSON.stringify(profesionales, null, 2), "utf-8");
}

function leerEspecialidades() {
  return JSON.parse(fs.readFileSync(rutaEspecialidades, "utf-8"));
}

function siguienteId(registros, campo) {
  return registros.reduce(
    (mayor, registro) => Math.max(mayor, Number(registro[campo]) || 0),
    0
  ) + 1;
}

function obtenerProfesionales(req, res) {
  res.render("listProfesionales", { profesionales: leerProfesionales() });
}

function mostrarFormularioNuevo(req, res) {
  res.render("formProfesionales", {
    profesional: null,
    editando: false,
    especialidades: leerEspecialidades()
  });
}

function obtenerProfesionalPorId(req, res) {
  const id = parseInt(req.params.id, 10);
  const profesional = leerProfesionales().find(item => item.id_profesional === id);

  if (!profesional) {
    return res.status(404).json({ mensaje: "Profesional no encontrado" });
  }

  res.json(profesional);
}

function datosProfesional(body) {
  return {
    nombre: body.nombre,
    apellido: body.apellido,
    matricula_profesional: body.matricula_profesional,
    id_especialidad: Number(body.id_especialidad),
    telefono: body.telefono,
    correo_electronico: body.correo_electronico
  };
}

function agregarProfesional(req, res) {
  const profesionales = leerProfesionales();
  const nuevoProfesional = {
    id_profesional: siguienteId(profesionales, "id_profesional"),
    ...datosProfesional(req.body)
  };

  profesionales.push(nuevoProfesional);
  guardarProfesionales(profesionales);

  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    return res.redirect("/profesionales");
  }

  res.status(201).json({ mensaje: "Profesional agregado con éxito", profesional: nuevoProfesional });
}

function mostrarFormularioEdicion(req, res) {
  const id = parseInt(req.params.id, 10);
  const profesional = leerProfesionales().find(item => item.id_profesional === id);

  if (!profesional) {
    return res.status(404).send("Profesional no encontrado");
  }

  res.render("formProfesionales", {
    title: "Editar Profesional",
    profesional,
    editando: true,
    especialidades: leerEspecialidades()
  });
}

function actualizarProfesional(req, res) {
  const id = parseInt(req.params.id, 10);
  const profesionales = leerProfesionales();
  const profesionalIndex = profesionales.findIndex(item => item.id_profesional === id);

  if (profesionalIndex === -1) {
    return res.status(404).json({ mensaje: "Profesional no encontrado" });
  }

  profesionales[profesionalIndex] = {
    ...profesionales[profesionalIndex],
    ...datosProfesional(req.body)
  };
  guardarProfesionales(profesionales);

  if (req.method === "POST") {
    return res.redirect("/profesionales");
  }

  res.json({ mensaje: "Profesional actualizado con éxito", profesional: profesionales[profesionalIndex] });
}

function eliminarProfesional(req, res) {
  const id = parseInt(req.params.id, 10);
  const profesionales = leerProfesionales();
  const profesionalIndex = profesionales.findIndex(item => item.id_profesional === id);

  if (profesionalIndex === -1) {
    return res.status(404).json({ mensaje: "Profesional no encontrado" });
  }

  profesionales.splice(profesionalIndex, 1);
  guardarProfesionales(profesionales);

  if (req.method === "POST") {
    return res.redirect("/profesionales");
  }

  res.json({ mensaje: "Profesional eliminado con éxito" });
}

module.exports = {
  leerProfesionales,
  obtenerProfesionales,
  mostrarFormularioNuevo,
  obtenerProfesionalPorId,
  agregarProfesional,
  actualizarProfesional,
  eliminarProfesional,
  mostrarFormularioEdicion
};