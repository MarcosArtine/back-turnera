import test from "node:test";
import assert from "node:assert/strict";
import { validarContrasena } from "../utils/contrasena.js";

test("acepta frases de al menos 12 caracteres dentro del límite bcrypt", () => {
  assert.equal(validarContrasena("Una frase segura 123"), true);
  assert.equal(validarContrasena("12345678901"), false);
  assert.equal(validarContrasena("😀".repeat(12)), true);
});

test("rechaza contraseñas que superan 72 bytes UTF-8", () => {
  assert.equal(validarContrasena("á".repeat(37)), false);
});
