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
    contrasena: { type: String, required: true, select: false },
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