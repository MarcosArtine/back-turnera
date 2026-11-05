import mongoose from "mongoose";

// Define un turno y sus relaciones con paciente, profesional y especialidad.
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

turnoSchema.index({ estado: 1, profesional: 1, fecha_hora_inicio: 1 });
turnoSchema.index({ estado: 1, paciente: 1, fecha_hora_inicio: 1 });

export default mongoose.model("Turno", turnoSchema);
