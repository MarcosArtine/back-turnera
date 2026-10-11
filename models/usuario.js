import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema(
  {
    correo_electronico: { type: String, required: true, trim: true, lowercase: true },
    contrasena: { type: String, required: true, trim: true },
    rol: { type: String, required: true, enum: ["profesional", "admin"] }
  },
  { collection: "usuarios", versionKey: false }
);

export default mongoose.model("Usuario", usuarioSchema);