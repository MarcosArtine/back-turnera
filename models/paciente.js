class Paciente {
  constructor(id_paciente, nombre, apellido, dni, fecha_nacimiento, telefono, correo_electronico) {
    this.id_paciente = id_paciente;
    this.nombre = nombre;
    this.apellido = apellido;
    this.dni = dni;
    this.fecha_nacimiento = fecha_nacimiento;
    this.telefono = telefono;
    this.correo_electronico = correo_electronico;
  }
}

module.exports = Paciente;