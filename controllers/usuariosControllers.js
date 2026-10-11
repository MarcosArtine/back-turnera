import Usuario from '../models/usuario.js';


// Función para obtener un usuario por su correo electrónico
export async function obtenerUsuarioPorCorreo(req, res) {
  try {
    const { correo_electronico } = req.params;
    const usuario = await Usuario.findOne({ correo_electronico });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Función para crear un nuevo usuario
export async function crearUsuario(req, res) {
  try {
    const { correo_electronico, contrasena, rol } = req.body;
    const nuevoUsuario = new Usuario({ correo_electronico, contrasena, rol });
    await nuevoUsuario.save();
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export {
  obtenerUsuarioPorCorreo,
  crearUsuario
};