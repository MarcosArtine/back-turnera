//en el package.json agregamos "start": "node --watch index.js" para que se reinicie el servidor cada vez que hagamos un cambio en el código

const express = require("express");
const app = express();
const PORT = process.env.PORT ?? 3000; //Si no pasamos un puerto por entorno, se usa el 3000

const data = require("./database.json"); // Importar el archivo database.json

app.use(express.json());

// Cambie el array de turnos para que se cargue desde database.json
let turno = data;


// Ruta principal - devuelve todos los turnos
app.get("/turno", (req, res) => {
  return res.status(200).json(turno); //Por defecto devuelve un 200, pero lo pongo para que quede claro que es un OK
});

// GET -> obtener un turno por ID
app.get("/turno/:id", (req, res) => {

  const id = parseInt(req.params.id); //Obtener el parámetro desde la URL y convierte a numero
  const turnoEncontrado = turno.find(t => t.id === id); //busca elemento dentro del array
  if (!turnoEncontrado) {
    return res.status(404).json({ mensaje: "Turno no encontrado" }); //si no encuentra el turno devuelve un error 404
  }
  return res.status(200).json(turnoEncontrado); //si encuentra el turno devuelve un 200 (denuevo no hace falta poner status) y el turno
});

// POST -> agregar un nuevo turno
app.post("/turno", (req, res) => {

  const { id, especialidad } = req.body;
  const nuevoTurno = { id, especialidad };
  turno.push(nuevoTurno);
  res.status(201).json({ // Devuelve un mensaje de éxito y el turno agregado
    mensaje: "Turno agregado con éxito",
    tema: nuevoTurno
  });
});

// PUT -> actualizar un turno existente
app.put("/turno/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { especialidad } = req.body;
  const turnoIndex = turno.findIndex(t => t.id === id);

  // Verificar si el turno existe
  if (turnoIndex === -1) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  // Actualizar la especialidad del turno en la posición de turnoIndex
  turno[turnoIndex].especialidad = especialidad;
  res.json({
    mensaje: "Turno actualizado con éxito",
    tema: turno[turnoIndex]
  });
});

// DELETE -> eliminar un turno existente
app.delete("/turno/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const turnoIndex = turno.findIndex(t => t.id === id);

  // Verificar si el turno existe
  if (turnoIndex === -1) {
    return res.status(404).json({ mensaje: "Turno no encontrado" });
  }

  // Eliminar el turno del array en la posición de turnoIndex
  turno.splice(turnoIndex, 1);
  res.json({ mensaje: "Turno eliminado con éxito" });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log("Servidor de node escuchando en http://localhost:" + PORT);
});