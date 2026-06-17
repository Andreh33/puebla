/**
 * Generación automática de descripciones y meta descriptions para productos.
 *
 * Flujo:
 *  - `applyTemplate(body, product)` sustituye los placeholders {brand},
 *    {color}, {name}, {category}.
 *  - `pickTemplateForCategory(categorySlug, count)` consulta la DB y
 *    devuelve UNA plantilla aleatoria entre las activas con ese slug.
 *    Fallback a `default` si no encuentra.
 *  - `generateAutoDescription(productId)` busca template, aplica y devuelve
 *    el texto resultante (NO persiste — lo hace el caller).
 *  - `generateAutoMeta(product)` construye un meta description corto
 *    (155 chars máx) sin consultar DB — pura concatenación de campos.
 */

import { db } from "@/lib/db";

interface ProductInfo {
  name: string;
  colorName: string;
  brand: { name: string };
  category: { name: string; slug: string };
}

function applyPlaceholders(template: string, product: ProductInfo): string {
  return template
    .replace(/\{brand\}/g, product.brand.name)
    .replace(/\{color\}/g, product.colorName.toLowerCase())
    .replace(/\{name\}/g, product.name)
    .replace(/\{category\}/g, product.category.name.toLowerCase());
}

interface TemplateRow {
  id: string;
  body: string;
  metaShort: string | null;
  categorySlug: string;
}

/**
 * Elige una plantilla aleatoria entre las activas de esa categoría. Si no
 * hay match exacto, prueba con `default`. Devuelve null si tampoco hay
 * default (DB vacía sin sembrar).
 */
export async function pickTemplateForCategory(
  categorySlug: string,
): Promise<TemplateRow | null> {
  // Intento 1: exact slug
  let candidates = await db.descriptionTemplate.findMany({
    where: { categorySlug, isActive: true },
    select: { id: true, body: true, metaShort: true, categorySlug: true },
  });

  // Intento 2: fallback a default
  if (candidates.length === 0 && categorySlug !== "default") {
    candidates = await db.descriptionTemplate.findMany({
      where: { categorySlug: "default", isActive: true },
      select: { id: true, body: true, metaShort: true, categorySlug: true },
    });
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

/**
 * Devuelve { description, metaDescription } generados a partir de la
 * plantilla aleatoria + datos del producto. NO persiste — el caller decide.
 */
export async function generateAutoDescription(productId: string): Promise<{
  description: string;
  metaDescription: string;
  templateId: string;
} | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      colorName: true,
      brand: { select: { name: true } },
      category: { select: { name: true, slug: true } },
    },
  });
  if (!product) return null;

  const template = await pickTemplateForCategory(product.category.slug);
  if (!template) return null;

  const description = applyPlaceholders(template.body, product);
  const metaDescription = template.metaShort
    ? truncateMeta(applyPlaceholders(template.metaShort, product))
    : truncateMeta(generateAutoMetaFromProduct(product));

  return { description, metaDescription, templateId: template.id };
}

/**
 * Genera un meta description corto SIN consultar plantillas: concatena
 * marca + color + categoría + tagline genérica. Truncado a 155 chars.
 * Útil cuando no hay templates en DB o cuando el producto no encaja en
 * ninguna categoría conocida.
 */
export function generateAutoMetaFromProduct(product: ProductInfo): string {
  const parts = [
    `${product.name}`,
    product.colorName.toLowerCase() !== "único"
      ? `en ${product.colorName.toLowerCase()}`
      : "",
    `de ${product.brand.name}`,
    `en Zona Sport`,
  ].filter(Boolean);
  return truncateMeta(parts.join(" ") + " · envío 24/48 h en toda España.");
}

const META_MAX = 155;

function truncateMeta(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= META_MAX) return clean;
  // Cortamos por la última palabra completa antes del límite.
  const truncated = clean.slice(0, META_MAX - 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + "…";
}

/**
 * Aplica placeholders sin consultar DB. Útil para preview del cliente.
 */
export function applyTemplate(template: string, product: ProductInfo): string {
  return applyPlaceholders(template, product);
}

// ---------------------------------------------------------------------------
// Generación desde los CAMPOS del formulario (sin producto guardado)
// ---------------------------------------------------------------------------

export interface DescriptionFieldsInput {
  name: string;
  brandName?: string | null;
  categorySlug?: string | null;
  colorName?: string | null;
}

/**
 * Convierte un slug de categoría en un nombre legible para el placeholder
 * {category} (no tenemos el Category.name aquí). "anorack-treking" →
 * "anorack treking". Es una aproximación suficiente para el copy comercial;
 * el admin edita el texto después.
 */
function readableCategory(slug: string | null | undefined): string {
  if (!slug || slug === "default") return "deportivo";
  return slug.replace(/-/g, " ");
}

/**
 * Construye un ProductInfo a partir de los campos sueltos del form,
 * rellenando con valores neutros lo que falte, para reutilizar
 * `applyPlaceholders` tal cual.
 */
function fieldsToProductInfo(input: DescriptionFieldsInput): ProductInfo {
  return {
    name: input.name?.trim() || "Producto",
    colorName: input.colorName?.trim() || "Único",
    brand: { name: input.brandName?.trim() || "Zona Sport" },
    category: {
      name: readableCategory(input.categorySlug),
      slug: input.categorySlug?.trim() || "default",
    },
  };
}

/**
 * Igual que `generateAutoDescription` pero a partir de los CAMPOS del
 * formulario (no de un productId). NO lee el producto de la BD —permite
 * generar antes de guardar, al CREAR—, aunque SÍ consulta `descriptionTemplate`
 * para elegir la plantilla por categoría (fallback "default"). Devuelve el
 * texto ya con los placeholders sustituidos, o `null` si no hay plantillas
 * sembradas.
 */
export async function generateDescriptionFromFields(
  input: DescriptionFieldsInput,
): Promise<string | null> {
  const productInfo = fieldsToProductInfo(input);
  const template = await pickTemplateForCategory(productInfo.category.slug);
  if (!template) return null;
  return applyPlaceholders(template.body, productInfo);
}

/**
 * Igual que la meta automática pero desde los campos del form. Si hay una
 * plantilla de la categoría con `metaShort`, la usa (y trunca); si no, cae
 * en la meta genérica por concatenación. Nunca devuelve null: siempre hay
 * un meta razonable aunque no haya plantillas en BD.
 */
export async function generateMetaFromFields(
  input: DescriptionFieldsInput,
): Promise<string> {
  const productInfo = fieldsToProductInfo(input);
  const template = await pickTemplateForCategory(productInfo.category.slug);
  if (template?.metaShort) {
    return truncateMeta(applyPlaceholders(template.metaShort, productInfo));
  }
  return generateAutoMetaFromProduct(productInfo);
}
