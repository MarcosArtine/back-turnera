import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { conectarDB } from "./config/db.js";
import {
  cargarUsuarioDesdeJwt,
  requiereAdministrador,
  requiereAutenticacion
} from "./middleware/autenticacion.js";
import { inicializarAdministrador } from "./controllers/usuariosControllers.js";
import chatRoutes from "./routes/chatRoutes.js";
import especialidadesRoutes from "./routes/especialidadesRoutes.js";
import pacientesRoutes from "./routes/pacientesRoutes.js";
import profesionalesRoutes from "./routes/profesionalesRoutes.js";
import turnosRoutes from "./routes/turnosRoutes.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import mensajesRoutes from "./routes/mensajesRoutes.js";

const app = express();
let inicializacion;

// Registra middleware de entrada y presentación antes de declarar las rutas:
// así cada controlador puede recibir cuerpos JSON o formularios ya interpretados,
// y Express puede servir recursos estáticos y renderizar vistas Pug.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));
app.set("view engine", "pug");
app.set("views", "./views");

// El secreto JWT debe tener suficiente entropía; MongoDB continúa siendo
// obligatorio para los datos de la aplicación.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Configura JWT_SECRET con al menos 32 caracteres aleatorios en .env");
}
if (!process.env.MONGO_URI) {
  throw new Error("Falta configurar MONGO_URI en .env");
}

async function prepararAplicacion() {
  if (!inicializacion) {
    inicializacion = (async () => {
      await conectarDB();
      await inicializarAdministrador();
    })().catch(error => {
      inicializacion = undefined;
      throw error;
    });
  }

  await inicializacion;
}

app.use(async (_req, _res, next) => {
  try {
    await prepararAplicacion();
    next();
  } catch (error) {
    next(error);
  }
});

// Las rutas de usuarios se montan antes de exigir autenticación para permitir
// iniciar sesión y registrarse. Se carga opcionalmente la identidad JWT para
// que una persona autenticada no vuelva a las pantallas públicas de acceso.
app.use(cargarUsuarioDesdeJwt);
app.use(usuariosRoutes);
// A partir de este punto, las rutas protegidas requieren un JWT válido.
app.use(requiereAutenticacion);
// Las rutas de turnos y mensajes se montan antes de exigir rol de administrador
// para permitir que profesionales y pacientes accedan a sus propios recursos.
app.use("/turnos", turnosRoutes);
app.use("/mensajes", mensajesRoutes);

app.use(requiereAdministrador);

// La raíz lleva al listado de turnos. Ese recurso está disponible para
// profesionales autenticados; el middleware de administrador se registra
// después y protege únicamente las secciones administrativas siguientes.
app.get("/", (_req, res) => res.redirect("/turnos"));
app.use("/turnos", turnosRoutes);
// El asistente virtual (Gemini) está disponible para cualquier usuario autenticado,
// por eso se monta antes del middleware de administrador.
app.use("/api/chat", chatRoutes);
app.use(requiereAdministrador);
app.use("/pacientes", pacientesRoutes);
app.use("/profesionales", profesionalesRoutes);
app.use("/especialidades", especialidadesRoutes);

// Middleware centralizado de errores: Express lo identifica por sus cuatro
// parámetros. Las validaciones y conversiones de Mongoose indican datos de
// entrada inválidos (400); una clave única duplicada responde conflicto (409).
// Los demás errores se registran en el servidor y reciben una respuesta genérica
// para no exponer detalles internos al cliente.
app.use((error, _req, res, _next) => {
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ mensaje: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ mensaje: "Ya existe un registro con esos datos" });
  }

  console.error("Error no controlado en una solicitud:", error);
  res.status(500).json({ mensaje: "Error interno del servidor" });
});

export default app;