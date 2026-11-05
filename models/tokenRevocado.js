import mongoose from "mongoose";

const tokenRevocadoSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true },
    expira_en: { type: Date, required: true, expires: 0 }
  },
  { collection: "tokens_revocados", versionKey: false }
);

export default mongoose.model("TokenRevocado", tokenRevocadoSchema);
