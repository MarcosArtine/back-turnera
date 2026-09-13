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

module.exports = router;