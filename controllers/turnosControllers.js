const fs = require("fs"); // Importar el módulo fs para leer y escribir archivos
const path = require("path"); // Importar el módulo path para manejar rutas de archivos

// Apuntamos a la base de datos JSON
const rutaDatabase = path.join(__dirname, "../data/database.json");


//función para leer los turnos desde el archivo database.json
function leerTurnos() {
  const Data = fs.readFileSync(rutaDatabase, "utf-8"); // Leer el contenido del archivo database.json
  return JSON.parse(Data)
}

//funcion para guardar los turnos en el archivo database.json
function guardarTurnos(turnos) {
  const Data = JSON.stringify(turnos, null, 2);
  fs.writeFileSync(rutaDatabase, Data, "utf-8");
}


//GET -> obtener todos los turnos
const obtenerTurnos = (req, res) => {
  const turnos = leerTurnos();
  res.json(turnos);
}


// GET -> obtener un turno por ID
const obtenerTurnoPorId = (req, res) => {
  const id = parseInt(req.params.id);
  const turnos = leerTurnos();
  const turnoEncontrado = turnos.find(t => t.id === id);

  if (!turnoEncontrado) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }
  res.status(200).json(turnoEncontrado); //no hace falta el status(200) porque viene por default, pero lo dejo para que quede más claro que es un GET exitoso
};


// POST -> agregar un nuevo turno
const agregarTurno = (req, res) => {
  const { id, especialidad } = req.body;
  const nuevoTurno = { id, especialidad };
  const turnos = leerTurnos();
  turnos.push(nuevoTurno);
  guardarTurnos(turnos);
  res.status(201).json({ // Devuelve un mensaje de éxito y el turno agregado
    mensaje: "Turno agregado con éxito",
    tema: nuevoTurno
  });
}

// PUT -> actualizar un turno existente
const actualizarTurno = (req, res) => {
  const id = parseInt(req.params.id);
  const { especialidad } = req.body;
  const turnos = leerTurnos();
  const turnoIndex = turnos.findIndex(t => t.id === id);

  // Verificamos si el turno existe
  if (turnoIndex === -1) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  // Actualizar la especialidad del turno en la posición de turnoIndex
  turnos[turnoIndex].especialidad = especialidad;
  guardarTurnos(turnos);
  res.status(200).json({
    mensaje: "Turno actualizado con éxito",
    tema: turno[turnoIndex]
  }); // Devuelve un mensaje de éxito (denuevo no hace falta el status(200)) y el turno actualizado
};


// DELETE -> eliminar un turno existente
const eliminarTurno = (req, res) => {
  const id = parseInt(req.params.id);
  const turnoIndex = turno.findIndex(t => t.id === id);

  // Verificamos si el turno existe
  if (turnoIndex === -1) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  // Eliminamos el turno de la lista
  turno.splice(turnoIndex, 1); 
  guardarTurnos(turno);
  res.json({ mensaje: "Turno eliminado con éxito" });
}

// Exportamos las funciones para que puedan ser utilizadas en otros archivos
module.exports = {
  leerTurnos,
  obtenerTurnos,
  obtenerTurnoPorId,
  agregarTurno,
  actualizarTurno,
  eliminarTurno
};