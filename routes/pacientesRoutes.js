import express from "express";

const router = express.Router();

import {
  obtenerPacientes,
  mostrarFormularioNuevo,
  obtenerPacientePorId,
  agregarPaciente,
  eliminarPaciente,
  editarPaciente,
  mostrarFormularioEdicion
} from "../controllers/pacientesControllers.js";

// Asocia las rutas CRUD de pacientes con sus controladores.
router.get("/", obtenerPacientes);
router.get("/nuevo", mostrarFormularioNuevo);
router.get("/:id/editar", mostrarFormularioEdicion);
router.get("/:id", obtenerPacientePorId);
router.post("/", agregarPaciente);
router.put("/:id", editarPaciente);
router.post("/:id/editar", editarPaciente);
router.delete("/:id/eliminar", eliminarPaciente);
router.post("/:id/eliminar", eliminarPaciente);

export default router;