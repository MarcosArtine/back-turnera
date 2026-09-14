class Paciente {
  constructor(id_paciente, nombre, apellido, dni, fecha_nacimiento, telefono, email) {
    this.id_paciente = id_paciente;
    this.nombre = nombre;
    this.apellido = apellido;
    this.dni = dni;
    this.fecha_nacimiento = fecha_nacimiento;
    this.telefono = telefono;
    this.email = email;
  }
}

module.exports = Paciente;