/**
 * POST /api/import/tabla
 *
 * Alias del importador universal. La implementación vive en
 * `app/api/import/xlsx/route.ts` (que ya no es solo xlsx). Reexportamos su
 * handler y config para tener una URL con nombre claro sin duplicar lógica.
 */

export {
  POST,
  runtime,
  dynamic,
  maxDuration,
} from "../xlsx/route";
