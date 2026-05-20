/**
 * Zona Sport — autodetección del tipo de feed a partir de sus cabeceras.
 *
 * Tres familias:
 *  - "woocommerce": export nativo de WooCommerce (wc-product-export-*.csv).
 *    Reconocible por la combinación "Tipo" + "SKU" + "Nombre" + ("Precio normal"
 *    o "Imágenes"). Es el caso del export real del cliente.
 *  - "pricat": catálogo del proveedor (modelo / color / talla / EAN / PVP…).
 *    Reconocible por los nombres de columna oficiales del PRICAT (ver
 *    lib/importer/xlsx.ts → PRICAT_HEADERS y lib/importer/normalize.ts).
 *  - "generic": cualquier otra tabla. El procesador PRICAT intentará un mapeo
 *    básico (Nombre/Name/Producto → name, Precio/Price → retailPrice, etc.).
 *
 * La detección es puramente sintáctica sobre las cabeceras (case-insensitive,
 * trim) para que no dependa del formato del archivo.
 */

export type FeedKind = "pricat" | "woocommerce" | "generic";

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function makeHas(headers: string[]) {
  const set = new Set(headers.map(normalizeHeader));
  return (...candidates: string[]): boolean =>
    candidates.some((c) => set.has(normalizeHeader(c)));
}

/**
 * Detecta el tipo de feed por sus cabeceras.
 */
export function detectFeedKind(headers: string[]): FeedKind {
  const has = makeHas(headers);

  // --- WooCommerce -----------------------------------------------------------
  // El export nativo trae siempre estas columnas en español (el cliente exporta
  // en es_ES). "Tipo" + "SKU" + "Nombre" son las tres firmas fuertes; añadimos
  // "Precio normal" o "Imágenes" para no confundir con un PRICAT que también
  // pudiera traer "Tipo".
  const wooCore = has("Tipo") && has("SKU") && has("Nombre");
  const wooExtra = has("Precio normal", "Imágenes", "Imagenes", "Publicado");
  if (wooCore && wooExtra) return "woocommerce";

  // --- PRICAT ----------------------------------------------------------------
  // Firmas del catálogo del proveedor. "modelo" + "código artículo" + "color"
  // son obligatorias para el reader PRICAT; basta con esas para clasificarlo.
  // Aceptamos variantes con/sin acento y mayúsculas.
  const pricatModelo = has("modelo");
  const pricatArticulo = has(
    "código artículo",
    "codigo articulo",
    "código articulo",
    "codigo artículo",
  );
  const pricatColor = has("color");
  const pricatColorCode = has("cód.color", "cod.color", "código color", "codigo color");
  const pricatPvp = has("pvp");

  // Núcleo mínimo (lo que exige iterPricatRawRows): modelo + artículo + color.
  if (pricatModelo && pricatArticulo && pricatColor) return "pricat";
  // Variante: modelo + color + (cód.color o pvp) — algunos PRICAT no traen el
  // header exacto "código artículo" pero sí el resto del patrón proveedor.
  if (pricatModelo && pricatColor && (pricatColorCode || pricatPvp)) return "pricat";

  // --- Genérico --------------------------------------------------------------
  return "generic";
}

// ---------------------------------------------------------------------------
// Mapeo genérico → forma cruda del PRICAT
// ---------------------------------------------------------------------------

/**
 * Alias de columnas reconocidos para un feed "generic". La idea es mapear
 * tablas arbitrarias (un Excel manual, un export de otra tienda) al mismo
 * `RawPricatRow` que consume el normalizador PRICAT, para reutilizar todo el
 * pipeline (taxonomía, slugs, imágenes…).
 *
 * Cada clave del PRICAT lista las cabeceras candidatas (case-insensitive).
 */
const GENERIC_ALIASES: Record<string, string[]> = {
  modelo: ["modelo", "model", "referencia", "reference", "ref", "código", "codigo", "code", "sku"],
  codigoArticulo: [
    "código artículo",
    "codigo articulo",
    "código articulo",
    "sku",
    "ean",
    "barcode",
    "código de barras",
    "referencia",
    "ref",
  ],
  descripcionArt: ["descripción", "descripcion", "description", "nombre", "name", "producto", "product", "título", "titulo", "title"],
  tipo: ["tipo", "type", "categoría", "categoria", "category", "familia"],
  usoDeportivo: ["uso deportivo", "deporte", "sport", "uso"],
  marca: ["marca", "brand", "fabricante", "manufacturer"],
  codColor: ["cód.color", "cod.color", "código color", "codigo color", "color code", "id color"],
  color: ["color", "colour"],
  talla: ["talla", "size", "tamaño", "tamano"],
  perfil: ["perfil", "género", "genero", "gender", "sexo"],
  composicion: ["composición", "composicion", "composition", "material", "materiales"],
  tarifa: ["tarifa", "coste", "cost", "precio coste", "cost price", "precio compra"],
  pvp: ["pvp", "precio", "price", "precio normal", "precio venta", "retail", "precio público", "precio publico"],
  ean: ["ean", "barcode", "código de barras", "codigo de barras", "gtin"],
  url: ["url", "imagen", "image", "imágenes", "imagenes", "foto", "picture", "image url"],
  altaBaja: ["alta/baja", "estado", "status", "activo", "active"],
};

/**
 * Construye, para un conjunto de cabeceras reales, un mapa
 * `pricatKey → headerReal` resolviendo los alias genéricos. Solo incluye las
 * claves que se han podido mapear.
 */
export function buildGenericHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const byLower = new Map<string, string>();
  for (const h of headers) byLower.set(normalizeHeader(h), h);

  for (const [pricatKey, aliases] of Object.entries(GENERIC_ALIASES)) {
    for (const alias of aliases) {
      const real = byLower.get(normalizeHeader(alias));
      if (real) {
        map[pricatKey] = real;
        break;
      }
    }
  }
  return map;
}
