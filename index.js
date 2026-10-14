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

// Crea la instancia principal de Express. El puerto puede venir del entorno
// (por ejemplo, en producción) y usa 3000 como valor local predeterminado.
const app = express();
const PORT = process.env.PORT ?? 3000;

// Registra middleware de entrada y presentación antes de declarar las rutas:
// así cada controlador puede recibir cuerpos JSON o formularios ya interpretados,
// y Express puede servir recursos estáticos y renderizar vistas Pug.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "pug");
app.set("views", "./views");

// La clave de sesión debe tener suficiente longitud para proteger las cookies
// firmadas. La URI de MongoDB también es obligatoria porque se usa tanto para
// la aplicación como para almacenar las sesiones; fallar aquí evita arrancar
// con una configuración incompleta.
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("Configura SESSION_SECRET con al menos 32 caracteres en .env");
}
if (!process.env.MONGO_URI) {
  throw new Error("Falta configurar MONGO_URI en .env");
}

// Configura sesiones persistentes en MongoDB. La sesión se guarda en una
// colección separada y vence tras ocho horas; `rolling` renueva ese plazo con
// cada solicitud. `resave` y `saveUninitialized` evitan escrituras innecesarias
// y no crean sesiones para visitantes que todavía no tienen datos de sesión.
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
    // El navegador no permite leer la cookie desde JavaScript; `sameSite`
    // restringe su envío en solicitudes de otros sitios y `secure` exige HTTPS
    // en producción. En desarrollo permite probar por HTTP local.
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Las rutas de usuarios se montan antes de exigir autenticación para permitir
// iniciar sesión y registrarse. A partir de este punto, el middleware detiene
// solicitudes sin una sesión válida antes de que lleguen a las rutas protegidas.
app.use(usuariosRoutes);
app.use(requiereAutenticacion);

// La raíz lleva al listado de turnos. Ese recurso está disponible para
// profesionales autenticados; el middleware de administrador se registra
// después y protege únicamente las secciones administrativas siguientes.
app.get("/", (_req, res) => res.redirect("/turnos"));
app.use("/turnos", turnosRoutes);
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

// La inicialización es secuencial: primero se establece la conexión con la base
// de datos y luego se crea el administrador inicial si hace falta. El `await`
// impide que el servidor acepte solicitudes antes de completar ambos pasos.
await conectarDB();
await inicializarAdministrador();

// Empieza a escuchar en el puerto configurado únicamente después de inicializar
// la aplicación y deja constancia de la dirección local en la consola.
app.listen(PORT, () => {
  console.log(`Servidor de node escuchando en http://localhost:${PORT}`);
});