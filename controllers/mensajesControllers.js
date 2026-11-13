import mongoose from "mongoose";
import Mensaje from "../models/mensaje.js";
import Usuario from "../models/usuario.js";

const LIMITE_HISTORIAL = 100;

export async function obtenerHistorialMensajes(req, res, next) {
  try {
    const otroUsuarioId = req.params.usuarioId;
    const miId = req.usuario.id;

    if (!mongoose.isObjectIdOrHexString(otroUsuarioId)) {
      return res.status(400).json({ mensaje: "El ID del usuario no es válido" });
    }

    if (otroUsuarioId === miId) {
      return res.status(400).json({ mensaje: "No podés abrir una conversación con vos mismo" });
    }

    const otroUsuario = await Usuario.findById(otroUsuarioId).select("_id");
    if (!otroUsuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const mensajes = await Mensaje.find({
      $or: [
        { remitente: miId, destinatario: otroUsuarioId },
        { remitente: otroUsuarioId, destinatario: miId }
      ]
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(LIMITE_HISTORIAL);

    res.json(mensajes.reverse());
  } catch (error) {
    next(error);
  }
}

export function registrarEventosMensajes(io) {
  io.on("connection", socket => {
    const usuario = socket.data.usuario;
    const salaPropia = `usuario:${usuario.id}`;

    socket.join(salaPropia);

    socket.on("mensaje:enviar", async (datos, confirmar) => {
      if (typeof confirmar !== "function") {
        socket.emit("mensaje:error", {
          mensaje: "Falta la confirmación del envío"
        });
        return;
      }

      const fallar = mensaje => confirmar({ ok: false, mensaje });

      try {
        const destinatarioId = String(datos?.destinatarioId ?? "").trim();
        const contenido = typeof datos?.contenido === "string"
          ? datos.contenido.trim()
          : "";

        if (!mongoose.isObjectIdOrHexString(destinatarioId)) {
          return fallar("El destinatario no es válido");
        }

        if (destinatarioId === usuario.id) {
          return fallar("No podés enviarte mensajes a vos mismo");
        }

        if (!contenido || contenido.length > 2000) {
          return fallar("El mensaje debe tener entre 1 y 2000 caracteres");
        }

        const destinatario = await Usuario.findById(destinatarioId).select("_id");
        if (!destinatario) {
          return fallar("Usuario destinatario no encontrado");
        }

        const guardado = await Mensaje.create({
          remitente: usuario.id,
          destinatario: destinatarioId,
          contenido
        });

        const mensaje = {
          _id: guardado._id.toString(),
          remitente: usuario.id,
          destinatario: destinatarioId,
          contenido: guardado.contenido,
          createdAt: guardado.createdAt
        };

        io.to(`usuario:${usuario.id}`)
          .to(`usuario:${destinatarioId}`)
          .emit("mensaje:nuevo", mensaje);

        confirmar({ ok: true, mensaje });
      } catch (error) {
        console.error("Error al enviar un mensaje:", error);
        fallar("No se pudo enviar el mensaje");
      }
    });
  });
}

export async function mostrarChat(req, res, next) {
  try {
    const contactos = await Usuario.find({
      _id: { $ne: req.usuario.id }
    })
      .select("_id correo_electronico rol")
      .sort({ correo_electronico: 1 })
      .lean();

    res.render("chat", { contactos });
  } catch (error) {
    next(error);
  }
}