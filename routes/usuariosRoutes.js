import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  cerrarSesion,
  iniciarSesion,
  mostrarLogin,
  mostrarRegistro,
  registrarProfesional
} from "../controllers/usuariosControllers.js";

const router = express.Router();
const limitarIntentosLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { mensaje: "Demasiados intentos fallidos. Espera a que se reinicie la ventana de 15 minutos." }
});

// Publica el registro, acceso y cierre de sesión mediante sus controladores.
router.get("/registro", mostrarRegistro);
router.post("/registro", registrarProfesional);
router.get("/login", mostrarLogin);
router.post("/login", limitarIntentosLogin, iniciarSesion);
router.post("/logout", cerrarSesion);

export default router;
