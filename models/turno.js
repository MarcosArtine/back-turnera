import mongoose from "mongoose";

const turnoSchema = new mongoose.Schema(
  {
    paciente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paciente",
      required: true
    },
    profesional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profesional",
      required: true
    },
    especialidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Especialidad",
      required: true
    },
    fecha_hora_inicio: { type: Date, required: true },
    fecha_hora_fin: { type: Date, required: true },
    estado: {
      type: String,
      enum: ["Reservado", "Cancelado", "Atendido", "Completado"],
      default: "Reservado",
      required: true
    }
  },
  { collection: "turnos", timestamps: true }
);

export default mongoose.model("Turno", turnoSchema);
