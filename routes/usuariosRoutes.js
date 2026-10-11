import express from "express";

const router = express.Router();

import {
  obtenerUsuarioPorCorreo,
  crearUsuario
} from "../controllers/usuariosControllers.js";

// rutas CRUD para usuarios
router.get('/usuarios/:correo_electronico', obtenerUsuarioPorCorreo);
router.post('/usuarios', crearUsuario);

export default router;