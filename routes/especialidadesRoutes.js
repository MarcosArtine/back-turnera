import express from "express";

const router = express.Router();

import {
  obtenerEspecialidades,
  mostrarFormularioNuevo,
  crearEspecialidad,
  mostrarFormularioEditar,
  obtenerEspecialidadPorId,
  actualizarEspecialidad,
  eliminarEspecialidad
} from "../controllers/especialidadesControllers.js";

// Rutas de especialidades
router.get("/", obtenerEspecialidades);
router.get("/nuevo", mostrarFormularioNuevo);
router.get("/:id/editar", mostrarFormularioEditar);
router.get("/:id", obtenerEspecialidadPorId);
router.post("/", crearEspecialidad);
router.put("/:id", actualizarEspecialidad);
router.post("/:id/editar", actualizarEspecialidad);
router.delete("/:id/eliminar", eliminarEspecialidad);
router.post("/:id/eliminar", eliminarEspecialidad);

export default router;