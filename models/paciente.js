import mongoose from "mongoose";

const pacienteSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    dni: { type: String, required: true, trim: true },
    fecha_nacimiento: { type: Date, required: true },
    telefono: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true }
  },
  { collection: "pacientes", versionKey: false }
);

export default mongoose.model("Paciente", pacienteSchema);
