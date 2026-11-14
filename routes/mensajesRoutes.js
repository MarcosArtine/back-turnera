import express from "express";
import {
  enviarMensaje,
  mostrarChat,
  obtenerHistorialMensajes
} from "../controllers/mensajesControllers.js";

const router = express.Router();

router.get("/", mostrarChat);
router.post("/", enviarMensaje);
router.get("/:usuarioId", obtenerHistorialMensajes);

export default router;