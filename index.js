import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import { conectarDB } from "./config/db.js";
import especialidadesRoutes from "./routes/especialidadesRoutes.js";
import pacientesRoutes from "./routes/pacientesRoutes.js";
import profesionalesRoutes from "./routes/profesionalesRoutes.js";
import turnosRoutes from "./routes/turnosRoutes.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

app.set("view engine", "pug");
app.set("views", "./views");

app.get("/", (_req, res) => res.redirect("/turnos"));


// Rutas a los endpoints principales de la API
app.use("/turnos", turnosRoutes);
app.use("/pacientes", pacientesRoutes);
app.use("/profesionales", profesionalesRoutes);
app.use("/especialidades", especialidadesRoutes);

app.use((error, _req, res, _next) => {
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ mensaje: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ mensaje: "Ya existe un registro con esos datos" });
  }

  console.error("Error no controlado en una solicitud:", error);
  res.status(500).json({ mensaje: "Error interno del servidor" });
});

await conectarDB();

app.listen(PORT, () => {
  console.log(`Servidor de node escuchando en http://localhost:${PORT}`);
});