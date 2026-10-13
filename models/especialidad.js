import mongoose from "mongoose";

// Define los campos obligatorios de una especialidad y la duración estándar de sus turnos.
const especialidadSchema = new mongoose.Schema(
  {
    nombre_especialidad: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true },
    duracion_turno_default: { type: Number, required: true, min: 1 }
  },
  { collection: "especialidades", versionKey: false }
);

export default mongoose.model("Especialidad", especialidadSchema);
