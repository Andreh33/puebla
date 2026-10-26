import "server-only";
import fs from "node:fs";
import path from "node:path";
import { POST_TEXT_FIELDS, PRODUCT_TEXT_FIELDS, type SourceText } from "./content-contract";
const overlays = new Map<string, Record<string, Record<string, unknown>>>();
function applyCorrections<T extends SourceText>(
  source: T,
  file: string,
  fields: readonly string[],
): T {
  let corrections = overlays.get(file);
  if (!corrections) {
    try {
      corrections = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "data", "editorial", file), "utf8"),
      );
    } catch {
      corrections = {};
    }
    overlays.set(file, corrections!);
  }
  const correction = corrections?.[source.slug];
  if (!correction || typeof correction !== "object") return source;
  const allowed: Record<string, unknown> = {};
  for (const key of fields)
    if (typeof correction[key] === "string" || correction[key] === null)
      allowed[key] = correction[key];
  if (Array.isArray(correction.tags) && correction.tags.every((tag) => typeof tag === "string"))
    allowed.tags = correction.tags;
  return { ...source, ...allowed };
}
export function applyPostSourceCorrections<T extends SourceText>(source: T): T {
  return applyCorrections(source, "source-corrections.json", POST_TEXT_FIELDS);
}
export function applyProductSourceCorrections<T extends SourceText>(source: T): T {
  return applyCorrections(source, "product-source-corrections.json", PRODUCT_TEXT_FIELDS);
}
