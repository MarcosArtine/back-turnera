// Middleware de autenticación y autorización

// Permite continuar a administradores o profesionales con una referencia válida a su ficha.
export function requiereAutenticacion(req, res, next) {
  const usuario = req.session?.usuario;
  if (
    usuario?.rol === "admin" ||
    (usuario?.rol === "profesional" && /^[a-f\d]{24}$/i.test(usuario.profesionalId ?? ""))
  ) {
    res.locals.usuario = usuario;
    return next();
  }

  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/login");
  }

  res.status(401).json({ mensaje: "Debes iniciar sesión" });
}

// Restringe las operaciones administrativas y responde con prohibición a otros roles.
export function requiereAdministrador(req, res, next) {
  if (req.session?.usuario?.rol === "admin") {
    return next();
  }

  res.status(403).json({ mensaje: "Debes iniciar sesión como administrador" });
}
