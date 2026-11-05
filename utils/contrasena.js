export const LONGITUD_MINIMA_CONTRASENA = 12;
export const TAMANO_MAXIMO_CONTRASENA_BYTES = 72;

export function validarContrasena(contrasena) {
  return typeof contrasena === "string" &&
    [...contrasena].length >= LONGITUD_MINIMA_CONTRASENA &&
    Buffer.byteLength(contrasena, "utf8") <= TAMANO_MAXIMO_CONTRASENA_BYTES;
}
