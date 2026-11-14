const chat = document.querySelector(".chat-page");

if (chat) {
  const miUsuarioId = chat.dataset.miUsuarioId;
  const destinatario = document.getElementById("chat-destinatario");
  const listaMensajes = document.getElementById("chat-mensajes");
  const formulario = document.getElementById("chat-form");
  const campoContenido = document.getElementById("chat-contenido");
  const botonEnviar = document.getElementById("chat-enviar");
  const estado = document.getElementById("chat-estado");

  const mensajes = new Map();
  let usuarioSeleccionado = "";
  let solicitudHistorial = 0;
  let ultimoMensajeId = "";
  let consultaEnCurso = false;

  function esConversacionActual(mensaje) {
    const remitenteId = String(mensaje.remitente);
    const destinatarioId = String(mensaje.destinatario);

    return (
      (remitenteId === miUsuarioId && destinatarioId === usuarioSeleccionado) ||
      (remitenteId === usuarioSeleccionado && destinatarioId === miUsuarioId)
    );
  }

  function renderizarMensajes() {
    const ordenados = [...mensajes.values()].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );
    const fragmento = document.createDocumentFragment();

    for (const mensaje of ordenados) {
      const propio = String(mensaje.remitente) === miUsuarioId;
      const item = document.createElement("li");
      item.className = propio
        ? "chat-mensaje chat-mensaje-propio"
        : "chat-mensaje";

      const autor = document.createElement("strong");
      autor.textContent = propio
        ? "Vos"
        : destinatario.selectedOptions[0]?.textContent.trim() || "Contacto";

      const contenido = document.createElement("p");
      contenido.textContent = mensaje.contenido;

      const fecha = document.createElement("time");
      fecha.dateTime = mensaje.createdAt;
      fecha.textContent = new Date(mensaje.createdAt).toLocaleString();

      item.append(autor, contenido, fecha);
      fragmento.append(item);
    }

    listaMensajes.replaceChildren(fragmento);
    listaMensajes.scrollTop = listaMensajes.scrollHeight;
  }

  function agregarMensaje(mensaje) {
    if (!mensaje?._id || !esConversacionActual(mensaje)) return;

    mensajes.set(String(mensaje._id), mensaje);
    renderizarMensajes();
  }

  async function cargarHistorial() {
    usuarioSeleccionado = destinatario.value;
    const solicitudActual = ++solicitudHistorial;

    mensajes.clear();
    renderizarMensajes();

    if (!usuarioSeleccionado) {
      estado.textContent = "Seleccioná un usuario para abrir la conversación.";
      return;
    }

    estado.textContent = "Cargando mensajes...";

    try {
      const response = await fetch(
        `/mensajes/${encodeURIComponent(usuarioSeleccionado)}`,
        { headers: { Accept: "application/json" } }
      );
      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.mensaje || "No se pudo cargar la conversación");
      }

      if (solicitudActual !== solicitudHistorial) return;

      for (const mensaje of resultado) {
        mensajes.set(String(mensaje._id), mensaje);
      }

      ultimoMensajeId = resultado.length
        ? String(resultado[resultado.length - 1]._id)
        : "";
      renderizarMensajes();
      estado.textContent = "Conversación cargada. Los mensajes nuevos se actualizan automáticamente.";
    } catch (error) {
      if (solicitudActual === solicitudHistorial) {
        estado.textContent = error.message;
      }
    }
  }

  destinatario.addEventListener("change", cargarHistorial);

  async function consultarMensajesNuevos() {
    if (!usuarioSeleccionado || consultaEnCurso) return;

    const solicitudActual = solicitudHistorial;
    consultaEnCurso = true;

    try {
      const cursor = ultimoMensajeId
        ? `?desde=${encodeURIComponent(ultimoMensajeId)}`
        : "";
      const response = await fetch(
        `/mensajes/${encodeURIComponent(usuarioSeleccionado)}${cursor}`,
        { headers: { Accept: "application/json" } }
      );
      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(resultado.mensaje || "No se pudieron actualizar los mensajes");
      }
      if (solicitudActual !== solicitudHistorial) return;

      for (const mensaje of resultado) {
        agregarMensaje(mensaje);
        ultimoMensajeId = String(mensaje._id);
      }
    } catch (error) {
      if (solicitudActual === solicitudHistorial) {
        estado.textContent = error.message;
      }
    } finally {
      consultaEnCurso = false;
    }
  }

  window.setInterval(consultarMensajesNuevos, 3000);

  formulario.addEventListener("submit", async event => {
    event.preventDefault();

    const destinatarioId = destinatario.value;
    const contenido = campoContenido.value.trim();

    if (!destinatarioId) {
      estado.textContent = "Primero seleccioná un usuario.";
      destinatario.focus();
      return;
    }

    if (!contenido) {
      estado.textContent = "Escribí un mensaje antes de enviarlo.";
      campoContenido.focus();
      return;
    }

    botonEnviar.disabled = true;
    const solicitudActual = solicitudHistorial;

    try {
      const response = await fetch("/mensajes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ destinatarioId, contenido })
      });
      const respuesta = await response.json();

      if (!response.ok) {
        throw new Error(respuesta.mensaje || "No se pudo enviar el mensaje.");
      }
      if (solicitudActual !== solicitudHistorial) return;

      agregarMensaje(respuesta);
      ultimoMensajeId = String(respuesta._id);
      campoContenido.value = "";
      campoContenido.focus();
      estado.textContent = "Mensaje enviado.";
    } catch (error) {
      estado.textContent = error.message || "No se pudo enviar el mensaje.";
    } finally {
      botonEnviar.disabled = false;
    }
  });
}