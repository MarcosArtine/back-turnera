import test from "node:test";
import assert from "node:assert/strict";
import {
  dentroHorarioLaboral,
  fechaParaFormulario,
  parsearFechaHoraLocal,
  ZONA_HORARIA_AGENDA
} from "../utils/agenda.js";

test("interpreta y formatea las fechas en la zona horaria de Buenos Aires", () => {
  const fecha = parsearFechaHoraLocal("2026-11-09T09:00");
  assert.ok(fecha);
  assert.equal(fechaParaFormulario(fecha), "2026-11-09T09:00");
  assert.equal(ZONA_HORARIA_AGENDA, "America/Argentina/Buenos_Aires");
});

test("rechaza fechas locales mal formadas o imposibles", () => {
  assert.equal(parsearFechaHoraLocal("2026-02-31T10:00"), null);
  assert.equal(parsearFechaHoraLocal("2026-11-09"), null);
});

test("acepta turnos entre semana que terminan como máximo a las 17", () => {
  const inicio = parsearFechaHoraLocal("2026-11-09T16:00");
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  assert.equal(dentroHorarioLaboral(inicio, fin), true);
});

test("rechaza fines de semana, antes de apertura y turnos que exceden el cierre", () => {
  const sabado = parsearFechaHoraLocal("2026-11-07T10:00");
  const temprano = parsearFechaHoraLocal("2026-11-09T08:30");
  const tarde = parsearFechaHoraLocal("2026-11-09T16:30");
  assert.equal(dentroHorarioLaboral(sabado, new Date(sabado.getTime() + 30 * 60_000)), false);
  assert.equal(dentroHorarioLaboral(temprano, new Date(temprano.getTime() + 30 * 60_000)), false);
  assert.equal(dentroHorarioLaboral(tarde, new Date(tarde.getTime() + 60 * 60_000)), false);
});
