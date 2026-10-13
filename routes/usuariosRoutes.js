import express from "express";
import {
  cerrarSesion,
  iniciarSesion,
  mostrarLogin,
  mostrarRegistro,
  registrarProfesional
} from "../controllers/usuariosControllers.js";

const router = express.Router();

// Publica el registro, acceso y cierre de sesión mediante sus controladores.
router.get("/registro", mostrarRegistro);
router.post("/registro", registrarProfesional);
router.get("/login", mostrarLogin);
router.post("/login", iniciarSesion);
router.post("/logout", cerrarSesion);

export default router;
