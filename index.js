import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { conectarDB } from "./config/db.js";
import {
  cargarUsuarioDesdeJwt,
  requiereAdministrador,
  requiereAutenticacion,
  verificarTokenJwt,
  NOMBRE_COOKIE_JWT
} from "./middleware/autenticacion.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { inicializarAdministrador } from "./controllers/usuariosControllers.js";
import chatRoutes from "./routes/chatRoutes.js";
import especialidadesRoutes from "./routes/especialidadesRoutes.js";
import pacientesRoutes from "./routes/pacientesRoutes.js";
import profesionalesRoutes from "./routes/profesionalesRoutes.js";
import turnosRoutes from "./routes/turnosRoutes.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import mensajesRoutes from "./routes/mensajesRoutes.js";
import { registrarEventosMensajes } from "./controllers/mensajesControllers.js";

// Crea la instancia principal de Express. El puerto puede venir del entorno
// (por ejemplo, en producción) y usa 3000 como valor local predeterminado.
const app = express();
const PORT = process.env.PORT ?? 3000;

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

// Crea un servidor HTTP y un servidor de WebSocket (Socket.IO) para permitir
// la comunicación en tiempo real con los clientes. Esto es útil para notificar
// cambios de estado, como la creación de un nuevo turno, sin que el cliente
// tenga que refrescar la página.
const httpServer = createServer(app);
const io = new Server(httpServer);

// El middleware de Socket.IO valida la sesión del usuario a partir del token JWT
// presente en la cookie. Si el token es válido, se publica la identidad del
// usuario en `socket.data.usuario` para que los controladores de eventos puedan
// acceder a ella.
io.use(async (socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie ?? "";
  const cookie = cookieHeader
    .split(";")
    .map(parte => parte.trim())
    .find(parte => parte.startsWith(`${NOMBRE_COOKIE_JWT}=`));

  const token = cookie?.slice(NOMBRE_COOKIE_JWT.length + 1);

  try {
    const usuario = await verificarTokenJwt(token);

    if (!usuario) {
      return next(new Error("No autenticado"));
    }

    socket.data.usuario = usuario;
    return next();
  } catch (error) {
    console.error("Error validando sesión de WebSocket:", error);
    return next(new Error("No se pudo validar la sesión"));
  }
});

// Registra los eventos de mensajes para permitir que los usuarios envíen y reciban
// mensajes en tiempo real. Cada usuario se une a una sala propia para recibir
// notificaciones de nuevos mensajes dirigidos a él.
registrarEventosMensajes(io);

// La inicialización es secuencial: primero se establece la conexión con la base
// de datos y luego se crea el administrador inicial si hace falta. El `await`
// impide que el servidor acepte solicitudes antes de completar ambos pasos.
await conectarDB();
await inicializarAdministrador();

// El servidor HTTP escucha en el puerto configurado y registra un mensaje en la
// consola para indicar que está listo para recibir solicitudes.
httpServer.listen(PORT, () => {
   console.log(`Servidor de node escuchando en http://localhost:${PORT}`);
 });