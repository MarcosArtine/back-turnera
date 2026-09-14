const express = require("express");

const router = express.Router();

const {
  obtenerProfesionales,
  mostrarFormularioNuevo,
  obtenerProfesionalPorId,
  agregarProfesional,
  actualizarProfesional,
  eliminarProfesional,
  mostrarFormularioEdicion
} = require("../controllers/profesionalesControllers");

router.get("/", obtenerProfesionales);
router.get("/nuevo", mostrarFormularioNuevo);
router.get("/:id/editar", mostrarFormularioEdicion);
router.get("/:id", obtenerProfesionalPorId);
router.post("/", agregarProfesional);
router.put("/:id", actualizarProfesional);
router.post("/:id/editar", actualizarProfesional);
router.delete("/:id/eliminar", eliminarProfesional);
router.post("/:id/eliminar", eliminarProfesional);

module.exports = router;