import express from "express";

const router = express.Router();

import {
  obtenerTurnos,
  mostrarFormularioNuevo,
  obtenerTurnoPorId,
  agregarTurno,
  actualizarTurno,
  eliminarTurno,
  mostrarFormularioEdicion
} from "../controllers/turnosControllers.js";


// rutas CRUD para turnos
router.get("/", obtenerTurnos);
router.get("/nuevo", mostrarFormularioNuevo);
router.get("/:id/editar", mostrarFormularioEdicion);
router.get("/:id", obtenerTurnoPorId);
router.post("/", agregarTurno);
router.put("/:id", actualizarTurno);
router.post("/:id/editar", actualizarTurno); // Ruta para redirigir a la página principal cuando se edita un turno desde la vista
router.delete("/:id/eliminar", eliminarTurno);

router.post("/:id/eliminar", eliminarTurno); // Ruta para redirigimos a la página principal cuando se elimina un turno desde la vista

export default router;