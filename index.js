//en el package.json agregamos "start": "node --watch index.js" para que se reinicie el servidor cada vez que hagamos un cambio en el código

const express = require("express");
const app = express();
const PORT = process.env.PORT ?? 3000; //Si no pasamos un puerto por entorno, se usa el 3000

const { leerTurnos } = require("./controllers/turnosControllers"); // Importar los controladores de turnos

const turnosRoutes = require("./routes/turnosRoutes"); // Importar las rutas de turnos
const pacientesRoutes = require("./routes/pacientesRoutes");
const profesionalesRoutes = require("./routes/profesionalesRoutes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de Pug como motor de plantillas
app.set("view engine", "pug"); // Establecer Pug como motor de vistas
app.set("views", "./views"); // Establecer la carpeta de vistas

// Ruta de inicio que renderiza la vista index.pug
app.get("/", (req, res) => {
  const turnos = leerTurnos();
  res.render("index", {  // Renderizar la vista index.pug
    title: "Bienvenido a la API de Turnos",
    message: "Esta es la página de inicio de la API de Turnos.",
    turnos: turnos
  });
});

app.use("/turnos", turnosRoutes); // Usar las rutas de turnos en la ruta /turnos
app.use("/pacientes", pacientesRoutes);
app.use("/profesionales", profesionalesRoutes);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log("Servidor de node escuchando en http://localhost:" + PORT);
});