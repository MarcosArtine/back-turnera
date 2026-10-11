import mongoose from "mongoose";

const profesionalSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    matricula_profesional: { type: String, required: true, trim: true },
    especialidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Especialidad",
      required: true
    },
    telefono: { type: String, required: true, trim: true },
    correo_electronico: { type: String, required: true, trim: true, lowercase: true }
  },
  { collection: "profesionales", versionKey: false }
);

export default mongoose.model("Profesional", profesionalSchema);
