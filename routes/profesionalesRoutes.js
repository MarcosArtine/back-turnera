import express from "express";

const router = express.Router();

// Asocia las rutas CRUD de profesionales con las funciones que procesan cada solicitud.
import {
  obtenerProfesionales,
  mostrarFormularioNuevo,
  obtenerProfesionalPorId,
  agregarProfesional,
  actualizarProfesional,
  eliminarProfesional,
  mostrarFormularioEdicion
} from "../controllers/profesionalesControllers.js";

router.get("/", obtenerProfesionales);
router.get("/nuevo", mostrarFormularioNuevo);
router.get("/:id/editar", mostrarFormularioEdicion);
router.get("/:id", obtenerProfesionalPorId);
router.post("/", agregarProfesional);
router.put("/:id", actualizarProfesional);
router.post("/:id/editar", actualizarProfesional);
router.delete("/:id/eliminar", eliminarProfesional);
router.post("/:id/eliminar", eliminarProfesional);

export default router;