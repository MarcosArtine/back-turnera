const express = require("express");

const router = express.Router();

const {
  obtenerPacientes,
  mostrarFormularioNuevo,
  obtenerPacientePorId,
  agregarPaciente,
  eliminarPaciente,
  editarPaciente,
  mostrarFormularioEdicion
} = require("../controllers/pacientesControllers");

// Rutas de pacientes
router.get("/", obtenerPacientes);
router.get("/nuevo", mostrarFormularioNuevo);
router.get("/:id/editar", mostrarFormularioEdicion);
router.get("/:id", obtenerPacientePorId);
router.post("/", agregarPaciente);
router.put("/:id", editarPaciente);
router.post("/:id/editar", editarPaciente);
router.delete("/:id/eliminar", eliminarPaciente);
router.post("/:id/eliminar", eliminarPaciente);

module.exports = router;