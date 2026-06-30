/**
 * Traducción de los errores de validación del editor de producto a mensajes
 * claros en español, agrupados por pestaña, para mostrarlos en un aviso
 * CENTRADO (ver components/admin/FormErrorDialog.tsx).
 *
 * Puro y testeable: no toca DOM ni react-hook-form; recibe el objeto de errores
 * (FieldErrors, tratado como datos planos) y, opcionalmente, los valores
 * actuales del formulario para precisar longitudes. Conoce las reglas del
 * ProductSchema (lib/validators.ts) para explicar CADA campo, incluso los que
 * no tienen aviso propio en la UI (metaTitle, composición, peso, tallas…).
 */

export type ProductFormErrorItem = {
  /** clave de pestaña del editor: general | imagenes | precios | seo | origen */
  tab: string;
  /** etiqueta visible de la pestaña */
  tabLabel: string;
  /** clave del campo (name, metaTitle, sizes.1.ean…) */
  field: string;
  /** etiqueta del campo en español */
  label: string;
  /** explicación clara de qué falla y cómo resolverlo */
  message: string;
};

type FieldMeta = { tab: string; label: string; rule?: string };

const TAB_LABELS: Record<string, string> = {
  general: "General",
  imagenes: "Imágenes",
  precios: "Precios y tallas",
  seo: "SEO",
  origen: "Origen externo",
};

const TAB_ORDER = ["general", "imagenes", "precios", "seo", "origen"];

const FIELD_META: Record<string, FieldMeta> = {
  name: { tab: "general", label: "Nombre", rule: "entre 3 y 200 caracteres" },
  slug: { tab: "general", label: "Slug", rule: "solo minúsculas, números y guiones (3-200 caracteres)" },
  shortName: { tab: "general", label: "Nombre corto", rule: "máximo 120 caracteres" },
  description: { tab: "general", label: "Descripción", rule: "máximo 20.000 caracteres" },
  technicalDescription: { tab: "general", label: "Descripción técnica", rule: "máximo 20.000 caracteres" },
  brandId: { tab: "general", label: "Marca", rule: "selecciona una marca" },
  colorName: { tab: "general", label: "Color · nombre", rule: "entre 1 y 60 caracteres" },
  colorHex: { tab: "general", label: "Color · hex", rule: "formato #RRGGBB" },
  sportUse: { tab: "general", label: "Uso deportivo", rule: "máximo 120 caracteres" },
  composition: { tab: "general", label: "Composición", rule: "máximo 500 caracteres" },
  footwearType: { tab: "general", label: "Tipo de calzado", rule: "enum" },
  garmentType: { tab: "general", label: "Tipo de prenda", rule: "enum" },
  garmentVariant: { tab: "general", label: "Variante de prenda", rule: "enum" },
  tags: { tab: "general", label: "Tags", rule: "máximo 20 etiquetas de 50 caracteres" },
  costPrice: { tab: "precios", label: "Precio coste", rule: "número mayor o igual a 0" },
  retailPrice: { tab: "precios", label: "PVP", rule: "número mayor o igual a 0" },
  salePrice: { tab: "precios", label: "Precio rebajado", rule: "número mayor o igual a 0" },
  taxRate: { tab: "precios", label: "IVA", rule: "entre 0 y 50" },
  stock: { tab: "precios", label: "Stock", rule: "número entero mayor o igual a 0" },
  weight: { tab: "precios", label: "Peso", rule: "número mayor o igual a 0" },
  metaTitle: { tab: "seo", label: "Meta título", rule: "máximo 70 caracteres" },
  metaDescription: { tab: "seo", label: "Meta descripción", rule: "máximo 170 caracteres" },
  source: { tab: "origen", label: "Fuente" },
  externalId: { tab: "origen", label: "External ID" },
  externalUrl: { tab: "origen", label: "URL externa", rule: "URL válida" },
  modelCode: { tab: "origen", label: "Código modelo", rule: "máximo 60 caracteres" },
  sku: { tab: "origen", label: "SKU", rule: "máximo 64 caracteres" },
};

const SIZE_SUBFIELD_LABELS: Record<string, string> = {
  size: "Talla (texto)",
  ean: "EAN",
  stock: "Stock",
  costPrice: "Precio coste",
  retailPrice: "PVP",
};

const ENUM_FIELDS = new Set(["footwearType", "garmentType", "garmentVariant"]);

function lengthOf(values: Record<string, unknown> | undefined, key: string): number | null {
  if (!values) return null;
  const v = values[key];
  return typeof v === "string" ? v.length : null;
}

function buildMessage(field: string, meta: FieldMeta, values?: Record<string, unknown>): string {
  if (ENUM_FIELDS.has(field)) {
    return 'El valor guardado no es válido (probablemente una clasificación antigua). Vuelve a elegirlo en la lista o déjalo en "(sin asignar)".';
  }
  if (!meta.rule) return "Revisa este campo.";
  const base = `Debe cumplir: ${meta.rule}.`;
  const len = lengthOf(values, field);
  if (len != null && /caracteres/.test(meta.rule)) {
    return `${base} Ahora mismo tiene ${len} caracteres.`;
  }
  return base;
}

/**
 * Convierte el objeto de errores de react-hook-form (+ valores opcionales) en
 * una lista ordenada por pestaña, con etiqueta y mensaje claros en español.
 * Devuelve [] si no hay errores.
 */
export function collectProductFormErrors(
  errors: Record<string, unknown>,
  values?: Record<string, unknown>,
): ProductFormErrorItem[] {
  const items: ProductFormErrorItem[] = [];

  for (const key of Object.keys(errors ?? {})) {
    if (key === "sizes") continue; // tratado aparte (array)
    const meta = FIELD_META[key];
    if (meta) {
      items.push({
        tab: meta.tab,
        tabLabel: TAB_LABELS[meta.tab] ?? meta.tab,
        field: key,
        label: meta.label,
        message: buildMessage(key, meta, values),
      });
    } else {
      const err = errors[key] as { message?: string } | undefined;
      items.push({
        tab: "general",
        tabLabel: TAB_LABELS.general!,
        field: key,
        label: key,
        message: err?.message || "Revisa este campo.",
      });
    }
  }

  // sizes: react-hook-form entrega un array con un objeto de errores por fila
  // (con huecos undefined en las filas válidas).
  const sizesErr = (errors ?? {}).sizes;
  if (Array.isArray(sizesErr)) {
    sizesErr.forEach((rowErr, i) => {
      if (!rowErr || typeof rowErr !== "object") return;
      for (const sub of Object.keys(rowErr as Record<string, unknown>)) {
        const subLabel = SIZE_SUBFIELD_LABELS[sub] ?? sub;
        items.push({
          tab: "precios",
          tabLabel: TAB_LABELS.precios!,
          field: `sizes.${i}.${sub}`,
          label: `Talla ${i + 1} · ${subLabel}`,
          message:
            sub === "ean"
              ? "El código EAN debe tener entre 8 y 14 dígitos (o dejarse vacío)."
              : sub === "size"
                ? "Escribe la talla (1 a 20 caracteres) o elimina la fila."
                : "Revisa este valor de la talla.",
        });
      }
    });
  } else if (sizesErr && typeof sizesErr === "object") {
    const err = sizesErr as { message?: string };
    items.push({
      tab: "precios",
      tabLabel: TAB_LABELS.precios!,
      field: "sizes",
      label: "Tallas",
      message: err.message || "Revisa las tallas.",
    });
  }

  items.sort((a, b) => TAB_ORDER.indexOf(a.tab) - TAB_ORDER.indexOf(b.tab));
  return items;
}
