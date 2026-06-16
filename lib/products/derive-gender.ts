import type { Gender } from "@prisma/client";

/**
 * Deriva el género del producto a partir de los SLUGS de sus categorías.
 * Las raíces de género son hombre/mujer/nino/nina/bebe (y sus hijas
 * `<gen>-textil`, `<gen>-calzado`). Complementos (accesorios*) no aportan género.
 *  - 1 género → ese. Varios → UNISEX. Ninguno → NO_ESPECIFICADO.
 */
export function deriveGenderFromCategorySlugs(slugs: string[]): Gender {
  const map: Array<[string, Gender]> = [
    ["hombre", "HOMBRE"],
    ["mujer", "MUJER"],
    ["nino", "NINO"],
    ["nina", "NINA"],
    ["bebe", "BEBE"],
  ];
  const found = new Set<Gender>();
  for (const slug of slugs) {
    for (const [root, gen] of map) {
      if (slug === root || slug.startsWith(`${root}-`)) found.add(gen);
    }
  }
  if (found.size === 1) return [...found][0]!;
  if (found.size > 1) return "UNISEX";
  return "NO_ESPECIFICADO";
}
