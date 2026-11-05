import mongoose from "mongoose";

const bloqueoAgendaSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    titular: { type: String, required: true },
    vence_en: { type: Date, required: true }
  },
  { collection: "bloqueos_agenda", versionKey: false }
);

export default mongoose.model("BloqueoAgenda", bloqueoAgendaSchema);
