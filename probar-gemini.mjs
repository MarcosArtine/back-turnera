// Diagnóstico: llama a Gemini directamente (sin pasar por la app) y mide el tiempo.
// Uso, desde la carpeta del proyecto:  node probar-gemini.mjs
import "dotenv/config";

const modelo = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Falta GEMINI_API_KEY en el archivo .env");
  process.exit(1);
}

const inicio = Date.now();
try {
  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Responde solo: OK" }] }],
        generationConfig: { maxOutputTokens: 256 }
      }),
      signal: AbortSignal.timeout(90_000)
    }
  );
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  const texto = await respuesta.text();
  console.log(`Modelo: ${modelo}\nEstado HTTP: ${respuesta.status}\nTiempo: ${segundos} s`);
  console.log(texto.slice(0, 600));
} catch (error) {
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
  console.error(`FALLÓ tras ${segundos} s:`, error.name, "-", error.message, "-", error.cause?.code ?? "(sin código)");
}
