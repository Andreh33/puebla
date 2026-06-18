/**
 * Convierte el valor de un <input type="number"> registrado con react-hook-form
 * a `number | null`, cubriendo dos casos:
 *
 *  - "" (vacío) → null
 *  - null / undefined → null
 *
 * El segundo caso es el que arregla el bug del "precio rebajado a 0": al añadir
 * una talla (re-render de `useFieldArray`), react-hook-form vuelve a pasar el
 * valor del campo numérico por `setValueAs`, y para un producto sin rebaja ese
 * valor es el `defaultValue` crudo `null`. Una guarda que solo cubría "" dejaba
 * pasar `Number(null)` === 0, colando un 0 espurio en salePrice/costPrice/PVP.
 *
 * Además descarta `NaN` (entrada no numérica) devolviendo null.
 */
export function parseNullableNumber(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
