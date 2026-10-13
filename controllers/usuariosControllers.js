import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Especialidad from "../models/especialidad.js";
import Profesional from "../models/profesional.js";
import Usuario from "../models/usuario.js";

const RONDAS_HASH = 12;

// Comprueba la configuración administrativa y crea o actualiza sus credenciales cifradas.
export async function inicializarAdministrador() {
  const correo = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const contrasena = process.env.ADMIN_PASSWORD;

  if (
    !correo ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
    !contrasena ||
    contrasena.length < 12
  ) {
    throw new Error("Configura un ADMIN_EMAIL válido y un ADMIN_PASSWORD de al menos 12 caracteres");
  }

  const existente = await Usuario.findOne({ correo_electronico: correo }).select("+contrasena");
  if (existente) {
    if (existente.rol !== "admin") {
      throw new Error("ADMIN_EMAIL ya existe y no tiene rol de administrador");
    }
    const contrasenaCoincide = existente.contrasena
      ? await bcrypt.compare(contrasena, existente.contrasena).catch(() => false)
      : false;
    if (!contrasenaCoincide) {
      existente.contrasena = await bcrypt.hash(contrasena, RONDAS_HASH);
      await existente.save();
    }
    return;
  }

  await Usuario.create({
    correo_electronico: correo,
    contrasena: await bcrypt.hash(contrasena, RONDAS_HASH),
    rol: "admin"
  });
  console.log("Usuario administrador inicial creado");
}

// Muestra el formulario de acceso o redirige a quienes ya iniciaron sesión.
export async function mostrarLogin(req, res) {
  if (req.session.usuario) {
    return res.redirect("/turnos");
  }
  res.render("login", { layout: false });
}

// Carga las especialidades que puede elegir una persona al registrarse como profesional.
export async function mostrarRegistro(req, res) {
  if (req.session.usuario) {
    return res.redirect("/turnos");
  }

  const especialidades = await Especialidad.find().sort({ nombre_especialidad: 1 });
  res.render("register", { layout: false, especialidades });
}

// Valida la solicitud pública y crea de forma vinculada el perfil profesional y su cuenta.
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
    if (
      typeof contrasena !== "string" ||
      contrasena.length < 8 ||
      Buffer.byteLength(contrasena, "utf8") > 72
    ) {
      return res.status(400).json({ mensaje: "La contraseña debe tener entre 8 y 72 bytes" });
    }
    if (contrasena !== confirmarContrasena) {
      return res.status(400).json({ mensaje: "Las contraseñas no coinciden" });
    }

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

// Verifica las credenciales, regenera la sesión y guarda el rol y perfil asociado.
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

    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.usuario = {
        id: usuario._id.toString(),
        correo_electronico: usuario.correo_electronico,
        rol: usuario.rol,
        ...(usuario.rol === "profesional"
          ? { profesionalId: usuario.profesional._id.toString() }
          : {})
      };
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        res.json({ mensaje: "Sesión iniciada", redirect: "/turnos" });
      });
    });
  } catch (error) {
    next(error);
  }
}

// Destruye la sesión y limpia la cookie de autenticación del navegador.
export function cerrarSesion(req, res, next) {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie("turnoflex.sid");
    res.json({ mensaje: "Sesión cerrada", redirect: "/login" });
  });
}
