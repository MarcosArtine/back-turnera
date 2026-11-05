import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Especialidad from "../models/especialidad.js";
import Profesional from "../models/profesional.js";
import TokenRevocado from "../models/tokenRevocado.js";
import Usuario from "../models/usuario.js";
import { NOMBRE_COOKIE_JWT, OPCIONES_COOKIE_JWT } from "../middleware/autenticacion.js";
import { validarContrasena } from "../utils/contrasena.js";

const RONDAS_HASH = 12;
const DURACION_JWT_MS = 30 * 60 * 1000;

// Valida la configuración del administrador inicial antes de tocar la base.
// Si el correo ya corresponde a un administrador, compara la contraseña
// configurada con el hash existente y solo lo reemplaza cuando cambió; en caso
// contrario crea el usuario con una contraseña cifrada usando bcrypt.
export async function inicializarAdministrador() {
  const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const contrasena = process.env.ADMIN_PASSWORD;

  // Aplica al administrador la misma política que al registro profesional.
  if (
    !correo ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    !validarContrasena(contrasena)
  ) {
    throw new Error("Configura un ADMIN_EMAIL válido y un ADMIN_PASSWORD de al menos 12 caracteres y 72 bytes");
  }

  // busca un usuario con ese correo y fuerza la carga del hash de contraseña
  const existente = await Usuario.findOne({ correo_electronico: correo }).select("+contrasena");
  if (existente) {
    if (existente.rol !== "admin") {
      throw new Error("ADMIN_EMAIL ya existe y no tiene rol de administrador");
    }
    // bcrypt.compare puede rechazar hashes corruptos; tratarlos como no
    // coincidentes permite restablecer la credencial desde la configuración.
    const contrasenaCoincide = existente.contrasena
      ? await bcrypt.compare(contrasena, existente.contrasena).catch(() => false)
      : false;
    if (!contrasenaCoincide) {
      existente.contrasena = await bcrypt.hash(contrasena, RONDAS_HASH);
      await existente.save();
    }
    return;
  }
  // si no existe, crea un nuevo usuario administrador con la contraseña cifrada
  await Usuario.create({
    correo_electronico: correo,
    contrasena: await bcrypt.hash(contrasena, RONDAS_HASH),
    rol: "admin"
  });
  console.log("Usuario administrador inicial creado");
}

// Evita que una cuenta autenticada vuelva a la pantalla de acceso y la dirige
// al área de turnos; para visitantes renderiza el formulario independiente.
export async function mostrarLogin(req, res) {
  if (req.usuario) {
    return res.redirect("/turnos");
  }
  res.render("login", { layout: false });
}

// Si todavía no hay una cuenta autenticada, carga las opciones válidas para
// asociar al perfil profesional y renderiza el formulario público de registro.
export async function mostrarRegistro(req, res) {
  if (req.usuario) {
    return res.redirect("/turnos");
  }

  const especialidades = await Especialidad.find().sort({ nombre_especialidad: 1 });
  res.render("register", { layout: false, especialidades });
}

// Normaliza los datos de texto y correo y valida los campos requeridos, el
// ObjectId de especialidad y la contraseña antes de consultar o escribir datos.
// Luego comprueba en paralelo que la especialidad exista y que el correo no esté
// usado por una cuenta ni por otro perfil. Como las dos creaciones deben
// mantenerse vinculadas, elimina el perfil si falla el alta de usuario; si esa
// compensación también falla, propaga ambos errores para no ocultar el problema.
export async function registrarProfesional(req, res, next) {
  try {
    const cuerpo = req.body ?? {};
    const nombre = String(cuerpo.nombre ?? "").trim();
    const apellido = String(cuerpo.apellido ?? "").trim();
    const matricula = String(cuerpo.matricula_profesional ?? "").trim();
    const especialidadId = String(cuerpo.especialidad ?? "").trim();
    const telefono = String(cuerpo.telefono ?? "").trim();
    const correo = String(cuerpo.correo_electronico ?? "").trim().toLowerCase();
    const contrasena = cuerpo.contrasena;
    const confirmarContrasena = cuerpo.confirmar_contrasena;
    // valida que los campos requeridos estén presentes y tengan formato correcto
    if (
      !nombre ||
      !apellido ||
      !matricula ||
      !telefono ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      !mongoose.isObjectIdOrHexString(especialidadId)
    ) {
      return res.status(400).json({ mensaje: "Completa todos los datos del profesional correctamente" });
    }
    if (!validarContrasena(contrasena)) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener al menos 12 caracteres y no superar 72 bytes"
      });
    }
    if (contrasena !== confirmarContrasena) {
      return res.status(400).json({ mensaje: "Las contraseñas no coinciden" });
    }
    // busca la especialidad y comprueba que el correo no esté usado por otra cuenta ni por otro profesional
    const [especialidad, usuarioExistente, profesionalExistente] = await Promise.all([
      Especialidad.findById(especialidadId),
      Usuario.exists({ correo_electronico: correo }),
      Profesional.exists({ correo_electronico: correo })
    ]);
    if (!especialidad) {
      return res.status(400).json({ mensaje: "La especialidad seleccionada no existe" });
    }
    if (usuarioExistente || profesionalExistente) {
      return res.status(409).json({ mensaje: "Ya existe una cuenta o profesional con ese correo" });
    }

    // MongoDB no agrupa estas dos escrituras en una transacción aquí; por eso se
    // conserva el documento creado para poder compensar una creación parcial.
    let profesional;
    try {
      profesional = await Profesional.create({
        nombre,
        apellido,
        matricula_profesional: matricula,
        especialidad: especialidad._id,
        telefono,
        correo_electronico: correo
      });
      await Usuario.create({
        correo_electronico: correo,
        contrasena: await bcrypt.hash(contrasena, RONDAS_HASH),
        rol: "profesional",
        profesional: profesional._id
      });
    } catch (error) {
      if (profesional) {
        try {
          await profesional.deleteOne();
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "No se pudo completar ni revertir el registro del profesional"
          );
        }
      }
      throw error;
    }
    // Si la solicitud espera HTML, redirige al login; si espera JSON, devuelve un mensaje y la ruta de redirección.
    if (req.headers.accept?.includes("text/html")) {
      return res.redirect("/login");
    }
    res.status(201).json({
      mensaje: "Registro exitoso. Ya puedes iniciar sesión.",
      redirect: "/login"
    });
  } catch (error) {
    next(error);
  }
}

// Normaliza el correo, valida que se recibieran credenciales y carga el hash
// explícitamente junto con la referencia profesional. Solo acepta hashes bcrypt
// reconocibles, roles habilitados y perfiles profesionales existentes; ante
// cualquier fallo devuelve el mismo error para no revelar qué dato no coincidió.
// Tras autenticar, firma un JWT de duración fija con la identidad y los permisos
// mínimos y lo entrega en una cookie no accesible desde JavaScript.
export async function iniciarSesion(req, res, next) {
  try {
    const cuerpo = req.body ?? {};
    const correo = String(cuerpo.correo_electronico ?? "").trim().toLowerCase();
    const contrasena = cuerpo.contrasena;

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      typeof contrasena !== "string" ||
      !contrasena
    ) {
      return res.status(400).json({ mensaje: "Ingresa correo y contraseña" });
    }
    // busca el usuario por correo, fuerza la carga del hash de contraseña y la referencia profesional
    const usuario = await Usuario.findOne({ correo_electronico: correo })
      .select("+contrasena")
      .populate("profesional");
    const credencialesValidas =
      usuario && typeof usuario.contrasena === "string" && /^\$2[aby]\$/.test(usuario.contrasena)
      ? await bcrypt.compare(contrasena, usuario.contrasena)
      : false;

    if (
      !credencialesValidas ||
      !["admin", "profesional"].includes(usuario.rol) ||
      (usuario.rol === "profesional" && !usuario.profesional)
    ) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos, o usuario sin permisos" });
    }

    const token = jwt.sign(
      {
        correo_electronico: usuario.correo_electronico,
        rol: usuario.rol,
        ...(usuario.rol === "profesional"
          ? { profesionalId: usuario.profesional._id.toString() }
          : {})
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        jwtid: randomUUID(),
        subject: usuario._id.toString(),
        expiresIn: "30m"
      }
    );
    res.cookie(NOMBRE_COOKIE_JWT, token, {
      ...OPCIONES_COOKIE_JWT,
      maxAge: DURACION_JWT_MS
    });
    res.json({ mensaje: "Sesión iniciada", redirect: "/turnos" });
  } catch (error) {
    next(error);
  }
}

// Revoca el token actual en MongoDB antes de eliminar su cookie para que una
// copia previamente obtenida tampoco pueda volver a autenticarse.
export async function cerrarSesion(req, res, next) {
  try {
    if (req.usuario?.jti && req.usuario.exp) {
      await TokenRevocado.create({
        jti: req.usuario.jti,
        expira_en: new Date(req.usuario.exp * 1000)
      });
    }
    res.clearCookie(NOMBRE_COOKIE_JWT, OPCIONES_COOKIE_JWT);
    res.json({ mensaje: "Sesión cerrada", redirect: "/login" });
  } catch (error) {
    next(error);
  }
}
