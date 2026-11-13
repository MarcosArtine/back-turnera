// Chat flotante con Gemini. Este script NO contiene la API Key: solo habla con el
// endpoint propio /api/chat, que reenvía la consulta a Gemini desde el servidor.
(() => {
  "use strict";

  const widget = document.getElementById("chat-widget");
  if (!widget) return;

  const toggle = widget.querySelector("#chat-toggle");
  const ventana = widget.querySelector("#chat-ventana");
  const botonCerrar = widget.querySelector("#chat-cerrar");
  const contenedor = widget.querySelector("#chat-mensajes");
  const formulario = widget.querySelector("#chat-formulario");
  const entrada = widget.querySelector("#chat-entrada");
  const botonEnviar = widget.querySelector("#chat-enviar");

  const ENDPOINT = "/api/chat";
  const CLAVE_ALMACEN = "turnoflex.chat";
  const MAX_MENSAJES_ENVIADOS = 20;
  const ALTURA_MAXIMA_ENTRADA = 120;
  const SALUDO = "¡Hola! Soy el asistente virtual de TurnoFlex. ¿En qué puedo ayudarte?";

  // Historial que se envía al servidor: [{ rol: "user" | "model", texto: "..." }].
  // El saludo inicial es solo visual y no forma parte del historial.
  let historial = [];
  let esperando = false;

  /* ---------- Persistencia ----------
     La página se recarga al navegar, así que se guarda la conversación en
     sessionStorage (se borra al cerrar la pestaña o al cerrar sesión). */

  function guardar() {
    try {
      sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify({ historial, abierto: !ventana.hidden }));
    } catch {
      /* El almacenamiento puede estar bloqueado: el chat sigue funcionando. */
    }
  }

  function cargar() {
    try {
      const datos = JSON.parse(sessionStorage.getItem(CLAVE_ALMACEN) ?? "null");
      if (Array.isArray(datos?.historial)) {
        historial = datos.historial.filter(
          m => m && ["user", "model"].includes(m.rol) && typeof m.texto === "string"
        );
      }
      return Boolean(datos?.abierto);
    } catch {
      return false;
    }
  }

  // Al cerrar sesión se descarta la conversación para que no la vea otra persona.
  document.addEventListener(
    "submit",
    event => {
      if (event.target instanceof HTMLFormElement && event.target.getAttribute("action") === "/logout") {
        try {
          sessionStorage.removeItem(CLAVE_ALMACEN);
        } catch {
          /* Sin acceso al almacenamiento: no hay nada que borrar. */
        }
      }
    },
    true
  );

  /* ---------- Formato seguro de las respuestas ----------
     Gemini responde con un markdown simple (**negrita**, listas). Primero se
     escapa TODO el HTML y luego se agregan solo etiquetas propias, de modo que
     el texto del modelo nunca puede inyectar HTML ni scripts. */

  function escaparHtml(texto) {
    return texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatoEnLinea(texto) {
    return escaparHtml(texto)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, "$1<em>$2</em>");
  }

  function markdownASeguro(texto) {
    const bloques = [];
    let lista = null;

    const cerrarLista = () => {
      if (!lista) return;
      bloques.push(`<${lista.etiqueta}>${lista.items.join("")}</${lista.etiqueta}>`);
      lista = null;
    };

    for (const linea of texto.split(/\r?\n/)) {
      const conViñeta = linea.match(/^\s*[-*•]\s+(.*)/);
      const numerada = linea.match(/^\s*\d+[.)]\s+(.*)/);
      const item = conViñeta ?? numerada;

      if (item) {
        const etiqueta = conViñeta ? "ul" : "ol";
        if (lista && lista.etiqueta !== etiqueta) cerrarLista();
        lista ??= { etiqueta, items: [] };
        lista.items.push(`<li>${formatoEnLinea(item[1])}</li>`);
        continue;
      }

      cerrarLista();
      const limpia = linea.replace(/^#{1,6}\s+/, "");
      if (limpia.trim()) bloques.push(`<p>${formatoEnLinea(limpia)}</p>`);
    }

    cerrarLista();
    return bloques.join("");
  }

  /* ---------- Interfaz ---------- */

  function bajarAlFinal() {
    contenedor.scrollTop = contenedor.scrollHeight;
  }

  // tipo: "usuario" | "asistente" | "error"
  function agregarMensaje(tipo, texto) {
    const burbuja = document.createElement("div");
    burbuja.className = `chat-mensaje chat-mensaje--${tipo}`;
    if (tipo === "asistente") {
      burbuja.innerHTML = markdownASeguro(texto);
    } else {
      burbuja.textContent = texto; // textContent: lo que escribe el usuario nunca se interpreta como HTML.
    }
    contenedor.append(burbuja);
    bajarAlFinal();
    return burbuja;
  }

  function mostrarEscribiendo() {
    const indicador = document.createElement("div");
    indicador.className = "chat-mensaje chat-mensaje--asistente chat-escribiendo";
    indicador.setAttribute("role", "status");
    indicador.setAttribute("aria-label", "El asistente está escribiendo");
    indicador.innerHTML = '<span class="chat-punto"></span>'.repeat(3);
    contenedor.append(indicador);
    bajarAlFinal();
    return indicador;
  }

  function ajustarAlturaEntrada() {
    entrada.style.height = "auto";
    entrada.style.height = `${Math.min(entrada.scrollHeight + 2, ALTURA_MAXIMA_ENTRADA)}px`;
  }

  function abrir({ enfocar = true } = {}) {
    ventana.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar asistente virtual");
    bajarAlFinal();
    if (enfocar) entrada.focus();
    guardar();
  }

  function cerrar() {
    ventana.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir asistente virtual");
    guardar();
  }

  /* ---------- Envío de mensajes ---------- */

  async function enviarMensaje(texto) {
    const burbujaUsuario = agregarMensaje("usuario", texto);
    historial.push({ rol: "user", texto });
    guardar();

    esperando = true;
    botonEnviar.disabled = true;
    const indicador = mostrarEscribiendo();

    try {
      const respuesta = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ mensajes: historial.slice(-MAX_MENSAJES_ENVIADOS) })
      });

      // Sesión vencida: se vuelve al inicio de sesión, igual que el resto de la app.
      if (respuesta.status === 401) {
        window.location.assign("/login");
        return;
      }

      const datos = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(datos?.mensaje || "No se pudo obtener una respuesta. Intenta de nuevo.");
      }

      historial.push({ rol: "model", texto: datos.respuesta });
      indicador.remove();
      agregarMensaje("asistente", datos.respuesta);
    } catch (error) {
      // El mensaje fallido se retira del historial y de la pantalla, y su texto
      // vuelve al campo de entrada para poder reenviarlo con un solo clic.
      historial.pop();
      burbujaUsuario.remove();
      if (!entrada.value) {
        entrada.value = texto;
        ajustarAlturaEntrada();
      }
      indicador.remove();
      agregarMensaje("error", error.message || "No se pudo obtener una respuesta. Intenta de nuevo.");
    } finally {
      indicador.remove();
      esperando = false;
      botonEnviar.disabled = false;
      guardar();
      if (!ventana.hidden) entrada.focus();
    }
  }

  /* ---------- Eventos ---------- */

  toggle.addEventListener("click", () => (ventana.hidden ? abrir() : cerrar()));

  botonCerrar.addEventListener("click", () => {
    cerrar();
    toggle.focus();
  });

  widget.addEventListener("keydown", event => {
    if (event.key === "Escape" && !ventana.hidden) {
      cerrar();
      toggle.focus();
    }
  });

  formulario.addEventListener("submit", event => {
    event.preventDefault();
    // Evita que el manejador global de formularios de script.js intercepte este envío.
    event.stopPropagation();

    const texto = entrada.value.trim();
    if (!texto || esperando) return;

    entrada.value = "";
    ajustarAlturaEntrada();
    enviarMensaje(texto);
  });

  // Enter envía; Shift+Enter inserta un salto de línea.
  entrada.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      formulario.requestSubmit();
    }
  });

  entrada.addEventListener("input", ajustarAlturaEntrada);

  /* ---------- Inicio ---------- */

  const estabaAbierto = cargar();
  agregarMensaje("asistente", SALUDO);
  for (const mensaje of historial) {
    agregarMensaje(mensaje.rol === "user" ? "usuario" : "asistente", mensaje.texto);
  }
  if (estabaAbierto) abrir({ enfocar: false });
})();
