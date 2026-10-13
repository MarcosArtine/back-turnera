import mongoose from "mongoose";

// Abre la conexión principal con MongoDB usando la URI configurada en el entorno.
export const conectarDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Falta configurar MONGO_URI");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};