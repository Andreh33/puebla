const SIZE_FILTER_SEPARATOR = "|";

type RawSizeFilter = string | string[] | undefined;

/**
 * Las tallas decimales usan coma (40,5), por lo que la coma no puede ser el
 * separador del filtro. Aceptamos el formato nuevo con `|` y conservamos la
 * lectura de URLs antiguas con varias tallas enteras separadas por comas.
 */
export function parseSizeFilterParam(value: RawSizeFilter): string[] {
  const rawValues = Array.isArray(value) ? value : value ? [value] : [];

  return rawValues.flatMap((raw) => {
    if (raw.includes(SIZE_FILTER_SEPARATOR)) {
      return raw.split(SIZE_FILTER_SEPARATOR).filter(Boolean);
    }

    // Una talla decimal localizada (40,5) debe conservarse completa. Exigimos
    // al menos dos cifras enteras para no confundir enlaces antiguos de ropa
    // como ?talla=4,6 con una supuesta talla decimal.
    if (/^\d{2,3},\d$/.test(raw)) return [raw];

    // Compatibilidad con enlaces antiguos como ?talla=40,41.
    return raw.split(",").filter(Boolean);
  });
}

export function serializeSizeFilterParam(values: readonly string[]): string {
  return values.filter(Boolean).join(SIZE_FILTER_SEPARATOR);
}
