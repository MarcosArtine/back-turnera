class Turno {
  constructor(id_turno, id_paciente, id_profesional, fecha_hora_inicio, fecha_hora_fin, estado) {
    this.id_turno = id_turno;
    this.id_paciente = id_paciente;
    this.id_profesional = id_profesional;
    this.nombrePaciente = nombrePaciente;
    this.apellidoPaciente = apellidoPaciente;
    this.especialidad = especialidad;
    this.fecha_hora_inicio = fecha_hora_inicio;
    this.fecha_hora_fin = fecha_hora_fin;
    this.estado = estado;
  }
}

module.exports = Turno;