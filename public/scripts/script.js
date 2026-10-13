// Intercepta formularios configurados para enviar sus datos como JSON mediante fetch.
document.addEventListener("submit", async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  // Deja que el navegador procese formularios GET normales; admite un método alternativo para CRUD.
  const methodOverride = form.dataset.fetchMethod;
  if (form.method.toUpperCase() === "GET" && !methodOverride) return;

  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const originalText = button?.textContent;
  const message = document.getElementById("form-message");

  // Evita envíos repetidos y limpia el mensaje anterior mientras se procesa la solicitud.
  if (button) {
    button.disabled = true;
    button.textContent = "Procesando...";
  }
  if (message) message.textContent = "";

  try {
    // Serializa los campos del formulario y solicita una respuesta JSON al servidor.
    const response = await fetch(form.action, {
      method: methodOverride || form.method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: ["GET", "HEAD"].includes(methodOverride || form.method.toUpperCase())
        ? undefined
        : JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : null;

    // Presenta los errores del servidor y, si se indicó, navega tras completar con éxito.
    if (!response.ok) {
      throw new Error(result?.mensaje || "No se pudo completar la solicitud");
    }

    const successRedirect = form.dataset.successRedirect || result?.redirect;
    if (successRedirect) {
      window.location.assign(successRedirect);
      return;
    }

    if (message) {
      message.textContent = result?.mensaje || "Cambios guardados correctamente";
      message.removeAttribute("role");
      message.setAttribute("role", "status");
    } else {
      window.location.reload();
    }
  } catch (error) {
    // Muestra errores de red o del servidor en el formulario o mediante una alerta.
    if (message) {
      message.textContent = error.message;
      message.setAttribute("role", "alert");
    } else {
      window.alert(error.message);
    }
  } finally {
    // Restaura el botón incluso cuando la solicitud falla.
    if (button?.isConnected) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
});