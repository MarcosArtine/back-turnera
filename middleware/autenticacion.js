import jwt from "jsonwebtoken";
import TokenRevocado from "../models/tokenRevocado.js";

export const NOMBRE_COOKIE_JWT = "turnoflex.token";
export const OPCIONES_COOKIE_JWT = Object.freeze({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/"
});

const ID_VALIDO = /^[a-f\d]{24}$/i;

// Verifica la validez de un token JWT y devuelve su contenido decodificado si es válido.
export async function verificarTokenJwt(token) {
  if (typeof token !== "string" || !token) return null;
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"]
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return null;
    throw error;
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    !ID_VALIDO.test(payload.sub ?? "") ||
    typeof payload.jti !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.correo_electronico !== "string" ||
    !["admin", "profesional"].includes(payload.rol) ||
    (payload.rol === "profesional" && !ID_VALIDO.test(payload.profesionalId ?? ""))
  ) {
    return null;
  }
  if (await TokenRevocado.exists({ jti: payload.jti })) return null;
  return {
    id: payload.sub,
    jti: payload.jti,
    exp: payload.exp,
    correo_electronico: payload.correo_electronico,
    rol: payload.rol,
    ...(payload.rol === "profesional"
      ? { profesionalId: payload.profesionalId }
      : {})
  };
}

// Verifica el token, si está presente, y publica su identidad para controladores
// y vistas. Un token inválido se descarta; las rutas protegidas lo rechazan luego.
export async function cargarUsuarioDesdeJwt(req, res, next) {
  const token = req.cookies?.[NOMBRE_COOKIE_JWT];
  if (!token) return next();

  try {
    const usuario = await verificarTokenJwt(token);

    if (!usuario) {
      res.clearCookie(NOMBRE_COOKIE_JWT, OPCIONES_COOKIE_JWT);
      return next();
    }

    req.usuario = usuario;
    res.locals.usuario = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}

// Debe montarse después de cargarUsuarioDesdeJwt: autoriza únicamente usuarios
// autenticados y responde 401 cuando el token es inválido o no está presente.
export function requiereAutenticacion(req, res, next) {
  const usuario = req.usuario;
  // Los administradores no dependen de un perfil profesional. Para profesionales
  // se exige un ObjectId válido, además de la firma ya verificada del token.
  if (
    usuario?.rol === "admin" ||
    (usuario?.rol === "profesional" && /^[a-f\d]{24}$/i.test(usuario.profesionalId ?? ""))
  ) {
    res.locals.usuario = usuario;
    return next();
  }

  // Las navegaciones HTML vuelven al acceso; solicitudes API reciben 401 para
  // que el cliente pueda manejar explícitamente la falta de autenticación.
  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/login");
  }

  res.status(401).json({ mensaje: "Debes iniciar sesión" });
}

// Debe montarse después de la autenticación: autoriza únicamente administradores
// y responde 403 cuando el token es válido pero su rol no permite esta sección.
export function requiereAdministrador(req, res, next) {
  if (req.usuario?.rol === "admin") {
    return next();
  }

  res.status(403).json({ mensaje: "Debes iniciar sesión como administrador" });
}
