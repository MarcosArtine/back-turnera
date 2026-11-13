import mongoose from "mongoose";

const mensajeSchema = new mongoose.Schema(
  {
    remitente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true
    },
    destinatario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true
    },
    contenido: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    }
  },
  {
    collection: "mensajes",
    timestamps: true,
    versionKey: false
  }
);

mensajeSchema.index({ remitente: 1, destinatario: 1, createdAt: 1 });
mensajeSchema.index({ destinatario: 1, remitente: 1, createdAt: 1 });

export default mongoose.model("Mensaje", mensajeSchema);