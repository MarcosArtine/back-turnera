import mongoose from "mongoose";

// Guarda las credenciales y el rol; los usuarios profesionales deben vincularse a su perfil.
const usuarioSchema = new mongoose.Schema(
  {
    correo_electronico: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    contrasena: {
      type: String,
      required: true,
      select: false,
      validate: {
        validator: value =>
          typeof value === "string" &&
          [...value].length >= 12 &&
          Buffer.byteLength(value, "utf8") <= 72,
        message: "La contraseña debe tener al menos 12 caracteres y no superar 72 bytes"
      }
    },
    rol: { type: String, required: true, enum: ["profesional", "admin"] },
    profesional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profesional",
      required: function () {
        return this.rol === "profesional";
      }
    }
  },
  { collection: "usuarios", versionKey: false }
);

export default mongoose.model("Usuario", usuarioSchema);