import mongoose from "mongoose";

// Define los datos personales y de contacto persistidos para cada paciente.
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
