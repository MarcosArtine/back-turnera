import mongoose from "mongoose";

const especialidadSchema = new mongoose.Schema(
  {
    nombre_especialidad: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true },
    duracion_turno_default: { type: Number, required: true, min: 1 }
  },
  { collection: "especialidades", versionKey: false }
);

export default mongoose.model("Especialidad", especialidadSchema);
