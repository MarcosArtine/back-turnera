import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import { conectarDB } from "./config/db.js";
import { requiereAdministrador, requiereAutenticacion } from "./middleware/autenticacion.js";
import { inicializarAdministrador } from "./controllers/usuariosControllers.js";
import especialidadesRoutes from "./routes/especialidadesRoutes.js";
import pacientesRoutes from "./routes/pacientesRoutes.js";
import profesionalesRoutes from "./routes/profesionalesRoutes.js";
import turnosRoutes from "./routes/turnosRoutes.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";

// Crea la aplicación Express y define el puerto configurable del servidor.
const app = express();
const PORT = process.env.PORT ?? 3000;

// Habilita el procesamiento de formularios y JSON, los archivos públicos y las vistas Pug.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "pug");
app.set("views", "./views");

// Evita iniciar la aplicación si faltan los secretos o la conexión obligatoria a MongoDB.
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("Configura SESSION_SECRET con al menos 32 caracteres en .env");
}
if (!process.env.MONGO_URI) {
  throw new Error("Falta configurar MONGO_URI en .env");
}

// Persiste sesiones en MongoDB y aplica opciones de seguridad y expiración a la cookie.
app.use(session({
  name: "turnoflex.sid",
  secret: process.env.SESSION_SECRET,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 8 * 60 * 60
  }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Las rutas de sesión y registro son públicas; el resto requiere una sesión válida.
app.use(usuariosRoutes);
app.use(requiereAutenticacion);

// Los profesionales acceden a sus turnos; las demás secciones se reservan al administrador.
app.get("/", (_req, res) => res.redirect("/turnos"));
app.use("/turnos", turnosRoutes);
app.use(requiereAdministrador);
app.use("/pacientes", pacientesRoutes);
app.use("/profesionales", profesionalesRoutes);
app.use("/especialidades", especialidadesRoutes);

// Convierte errores de validación y duplicados en respuestas HTTP claras, y registra los inesperados.
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

// Conecta la base de datos y asegura que exista el administrador inicial antes de aceptar solicitudes.
await conectarDB();
await inicializarAdministrador();

// Inicia el servidor después de completar las tareas de inicialización.
app.listen(PORT, () => {
  console.log(`Servidor de node escuchando en http://localhost:${PORT}`);
});