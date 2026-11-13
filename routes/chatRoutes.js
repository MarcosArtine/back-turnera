import express from "express";
import { rateLimit } from "express-rate-limit";
import { responderChat } from "../controllers/chatControllers.js";

const router = express.Router();

// Limita las consultas por usuario autenticado (no por IP) para cuidar la cuota
// de la API Key y evitar abusos. Esta ruta se monta después de requiereAutenticacion,
// así que `req.usuario` siempre existe.
const limitarConsultasChat = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.usuario.id,
  message: { mensaje: "Estás enviando mensajes muy rápido. Espera un minuto e intenta de nuevo." }
});

router.post("/", limitarConsultasChat, responderChat);

export default router;
