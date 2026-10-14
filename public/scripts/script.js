// Delegar el evento en document permite manejar todos los formularios presentes
// en las páginas sin registrar un listener individual para cada uno. Solo se
// interceptan elementos HTMLFormElement; otros eventos submit se ignoran.
document.addEventListener("submit", async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  // GET sin método alternativo conserva la navegación nativa del navegador,
  // incluyendo su query string. `data-fetch-method` permite que formularios
  // HTML pidan métodos CRUD que no son soportados directamente por el elemento.
  const methodOverride = form.dataset.fetchMethod;
  if (form.method.toUpperCase() === "GET" && !methodOverride) return;

  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  const originalText = button?.textContent;
  const message = document.getElementById("form-message");

  // Deshabilitar el botón evita envíos duplicados mientras fetch está pendiente.
  // Se guarda el texto original para restaurarlo al terminar, y el mensaje previo
  // se limpia para que no se confunda con el resultado de esta solicitud.
  if (button) {
    button.disabled = true;
    button.textContent = "Procesando...";
  }
  if (message) message.textContent = "";

  try {
    // Envía los campos como JSON y solicita JSON en la respuesta. GET y HEAD no
    // llevan cuerpo por las reglas de fetch; para los demás métodos, FormData
    // recopila los controles y se transforma en el objeto serializado.
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

    // Las respuestas HTTP no exitosas se convierten en errores visibles. En
    // éxito se prioriza el destino configurado en el formulario y luego el
    // `redirect` que devuelva la API; si no hay destino, se muestra el mensaje
    // recibido o se recarga la página cuando no hay un área de estado.
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
    // Captura tanto errores HTTP generados arriba como fallos de red. La vista
    // accesible del formulario los anuncia como alerta; las páginas sin ese
    // componente recurren a la alerta nativa del navegador.
    if (message) {
      message.textContent = error.message;
      message.setAttribute("role", "alert");
    } else {
      window.alert(error.message);
    }
  } finally {
    // El botón puede haberse quitado del DOM por una navegación o actualización;
    // solo se restaura si sigue conectado y, al ejecutarse en finally, también
    // se recupera cuando la solicitud falló.
    if (button?.isConnected) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
});