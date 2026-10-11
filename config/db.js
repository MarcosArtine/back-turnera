import mongoose from "mongoose";

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