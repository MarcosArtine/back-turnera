//en el package.json agregamos "start": "node --watch index.js" para que se reinicie el servidor cada vez que hagamos un cambio en el código

const express = require("express");
const app = express();
const PORT = process.env.PORT ?? 3000; //Si no pasamos un puerto por entorno, se usa el 3000

const turnosRoutes = require("./routes/turnosRoutes"); // Importar las rutas de turnos

app.use(express.json());

app.use("/turnos", turnosRoutes); // Usar las rutas de turnos en la ruta /turnos

// Iniciar el servidor
app.listen(PORT, () => {
  console.log("Servidor de node escuchando en http://localhost:" + PORT);
});