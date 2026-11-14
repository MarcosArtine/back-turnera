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

    const conversacion = [
      { remitente: miId, destinatario: otroUsuarioId },
      { remitente: otroUsuarioId, destinatario: miId }
    ];
    const desdeId = req.query.desde;
    let filtro = { $or: conversacion };

    if (desdeId) {
      if (!mongoose.isObjectIdOrHexString(desdeId)) {
        return res.status(400).json({ mensaje: "El cursor de mensajes no es válido" });
      }

      const cursor = await Mensaje.findOne({
        _id: desdeId,
        $or: conversacion
      }).select("createdAt");

      if (!cursor) {
        return res.status(400).json({ mensaje: "El cursor no pertenece a esta conversación" });
      }

      filtro = {
        $and: [
          { $or: conversacion },
          {
            $or: [
              { createdAt: { $gt: cursor.createdAt } },
              { createdAt: cursor.createdAt, _id: { $gt: cursor._id } }
            ]
          }
        ]
      };
    }

    let consulta = Mensaje.find(filtro);
    if (desdeId) {
      consulta = consulta.sort({ createdAt: 1, _id: 1 }).limit(LIMITE_HISTORIAL);
    } else {
      consulta = consulta.sort({ createdAt: -1, _id: -1 }).limit(LIMITE_HISTORIAL);
    }

    const mensajes = await consulta;

    res.json(desdeId ? mensajes : mensajes.reverse());
  } catch (error) {
    next(error);
  }
}

export async function enviarMensaje(req, res, next) {
  try {
    const remitenteId = req.usuario.id;
    const destinatarioId = String(req.body?.destinatarioId ?? "").trim();
    const contenido = typeof req.body?.contenido === "string"
      ? req.body.contenido.trim()
      : "";

    if (!mongoose.isObjectIdOrHexString(destinatarioId)) {
      return res.status(400).json({ mensaje: "El destinatario no es válido" });
    }

    if (destinatarioId === remitenteId) {
      return res.status(400).json({ mensaje: "No podés enviarte mensajes a vos mismo" });
    }

    if (!contenido || contenido.length > 2000) {
      return res.status(400).json({ mensaje: "El mensaje debe tener entre 1 y 2000 caracteres" });
    }

    const destinatario = await Usuario.findById(destinatarioId).select("_id");
    if (!destinatario) {
      return res.status(404).json({ mensaje: "Usuario destinatario no encontrado" });
    }

    const mensaje = await Mensaje.create({
      remitente: remitenteId,
      destinatario: destinatarioId,
      contenido
    });

    res.status(201).json(mensaje);
  } catch (error) {
    next(error);
  }
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