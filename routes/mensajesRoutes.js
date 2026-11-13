import express from "express";
import {
  mostrarChat,
  obtenerHistorialMensajes
} from "../controllers/mensajesControllers.js";

const router = express.Router();

router.get("/", mostrarChat);
router.get("/:usuarioId", obtenerHistorialMensajes);

export default router;