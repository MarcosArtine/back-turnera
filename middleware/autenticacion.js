// Autentica el acceso a las rutas protegidas y publica el usuario autenticado
// en `res.locals` para que las vistas puedan adaptar su contenido.
export function requiereAutenticacion(req, res, next) {
  const usuario = req.session?.usuario;
  // Los administradores no dependen de un perfil profesional. Para profesionales
  // se exige un ObjectId válido: una sesión incompleta o manipulada no alcanza
  // para acceder a la aplicación.
  if (
    usuario?.rol === "admin" ||
    (usuario?.rol === "profesional" && /^[a-f\d]{24}$/i.test(usuario.profesionalId ?? ""))
  ) {
    res.locals.usuario = usuario;
    return next();
  }

  // Las navegaciones HTML vuelven al acceso; solicitudes API reciben 401 para
  // que el cliente pueda manejar explícitamente la falta de autenticación.
  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/login");
  }

  res.status(401).json({ mensaje: "Debes iniciar sesión" });
}

// Debe montarse después de la autenticación: autoriza únicamente administradores
// y responde 403 cuando la sesión existe pero su rol no permite esta sección.
export function requiereAdministrador(req, res, next) {
  if (req.session?.usuario?.rol === "admin") {
    return next();
  }

  res.status(403).json({ mensaje: "Debes iniciar sesión como administrador" });
}
