const express = require("express");

const router = express.Router();

const {
  obtenerTurnos,
  obtenerTurnoPorId,
  agregarTurno,
  actualizarTurno,
  eliminarTurno
} = require("../controllers/turnosControllers");


// rutas CRUD
router.get("/", obtenerTurnos);
router.get("/:id", obtenerTurnoPorId);
router.post("/", agregarTurno);
router.put("/:id", actualizarTurno);
router.delete("/:id/eliminar", eliminarTurno);

router.post("/:id/eliminar", eliminarTurno); // Ruta para redirigimos a la página principal cuando se elimina un turno desde la vista

module.exports = router;