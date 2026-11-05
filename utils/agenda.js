import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const ZONA_HORARIA_AGENDA = "America/Argentina/Buenos_Aires";

export function parsearFechaHoraLocal(fechaHora) {
  if (typeof fechaHora !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fechaHora)) {
    return null;
  }
  const fecha = fromZonedTime(fechaHora, ZONA_HORARIA_AGENDA);
  if (
    !Number.isFinite(fecha.getTime()) ||
    formatInTimeZone(fecha, ZONA_HORARIA_AGENDA, "yyyy-MM-dd'T'HH:mm") !== fechaHora
  ) {
    return null;
  }
  return fecha;
}

export function fechaParaFormulario(fecha) {
  return formatInTimeZone(
    new Date(fecha),
    ZONA_HORARIA_AGENDA,
    "yyyy-MM-dd'T'HH:mm"
  );
}

export function dentroHorarioLaboral(inicio, fin) {
  const diaLocal = formatInTimeZone(inicio, ZONA_HORARIA_AGENDA, "yyyy-MM-dd");
  const diaSemana = new Date(`${diaLocal}T12:00:00Z`).getUTCDay();
  const fechaFin = formatInTimeZone(fin, ZONA_HORARIA_AGENDA, "yyyy-MM-dd");
  const horaInicio = formatInTimeZone(inicio, ZONA_HORARIA_AGENDA, "HH:mm");
  const horaFin = formatInTimeZone(fin, ZONA_HORARIA_AGENDA, "HH:mm");
  return diaSemana >= 1 && diaSemana <= 5 &&
    fechaFin === diaLocal &&
    horaInicio >= "09:00" &&
    horaFin <= "17:00";
}
