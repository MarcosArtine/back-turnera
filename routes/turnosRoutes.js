import express from "express";
import { requiereAdministrador } from "../middleware/autenticacion.js";

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


// Expone consultas de turnos y protege con rol administrador las operaciones de escritura.
router.get("/", obtenerTurnos);
router.get("/nuevo", requiereAdministrador, mostrarFormularioNuevo);
router.get("/:id/editar", requiereAdministrador, mostrarFormularioEdicion);
router.get("/:id", obtenerTurnoPorId);
router.post("/", requiereAdministrador, agregarTurno);
router.put("/:id", requiereAdministrador, actualizarTurno);
router.post("/:id/editar", requiereAdministrador, actualizarTurno); // Ruta para redirigir a la página principal cuando se edita un turno desde la vista
router.delete("/:id/eliminar", requiereAdministrador, eliminarTurno);

router.post("/:id/eliminar", requiereAdministrador, eliminarTurno); // Ruta para redirigimos a la página principal cuando se elimina un turno desde la vista

export default router;