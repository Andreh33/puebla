import { classify } from "@/lib/categories/classify";
import { inferFootwearType } from "@/lib/categories/footwear";
import {
  inferGarmentType,
  inferGarmentVariant,
  VARIANT_SLUG_BY_VARIANT,
  type GarmentVariant,
} from "@/lib/categories/garment";
import { VALID_VARIANT_SLUGS } from "@/lib/categories/taxonomy-tree";

export interface TreeAssignment {
  categorySlugs: string[];      // todas las categorías del árbol a enlazar (m2m)
  primarySlug: string | null;   // categoría principal (= categoryId legacy + primaryCategoryId)
  footwearType: string | null;
  garmentType: string | null;
  garmentVariant: string | null;
}

// Las 12 prendas que SÍ existen como subcategoría textil en el árbol.
const TEXTIL_TIPOS = new Set([
  "camiseta","polo","sudadera","polar","chandal","chaqueta","abrigo",
  "cortavientos","conjunto","pantalon","mallas","banador",
]);

/** Clasifica un producto (por nombre+género) en la taxonomía canónica. */
export function classifyToTree(name: string, gender: string, brand: string | null): TreeAssignment {
  const fam = classify(name);
  if (fam === "UNCLASSIFIED") return { categorySlugs: [], primarySlug: null, footwearType: null, garmentType: null, garmentVariant: null };
  if (fam.startsWith("accesorios:")) {
    const slug = "accesorios-" + fam.split(":")[1];
    return { categorySlugs: [slug], primarySlug: slug, footwearType: null, garmentType: null, garmentVariant: null };
  }
  const familia = fam as "textil" | "calzado";
  const genderRoots: string[] =
    gender === "HOMBRE" ? ["hombre"] :
    gender === "MUJER" ? ["mujer"] :
    gender === "NINO" ? ["nino"] :
    gender === "NINA" ? ["nina"] :
    gender === "BEBE" ? ["bebe"] :
    ["hombre", "mujer"]; // UNISEX y NO_ESPECIFICADO → ambos (el admin revisa en borrador)

  let footwearType: string | null = null;
  let garmentType: string | null = null;
  let typeSuffix: string | null = null;
  let variant: GarmentVariant | null = null;
  if (familia === "calzado") {
    footwearType = inferFootwearType({ name, sportUse: null, brand });
    if (footwearType) typeSuffix = footwearType.replace(/_/g, "-"); // futbol_sala → futbol-sala
  } else {
    garmentType = inferGarmentType({ categorySlug: null, name });
    typeSuffix = garmentType && TEXTIL_TIPOS.has(garmentType) ? garmentType : null;
    variant = garmentType ? inferGarmentVariant(name, garmentType) : null;
  }

  const categorySlugs: string[] = [];
  let appliedVariant: GarmentVariant | null = null;
  for (const g of genderRoots) {
    categorySlugs.push(`${g}-${familia}`);
    if (typeSuffix) categorySlugs.push(`${g}-${familia}-${typeSuffix}`);
    if (variant) {
      const vslug = `${g}-textil-${VARIANT_SLUG_BY_VARIANT[variant]}`;
      if (VALID_VARIANT_SLUGS.has(vslug)) { categorySlugs.push(vslug); appliedVariant = variant; }
    }
  }
  const firstG = genderRoots[0]!;
  const primarySlug = typeSuffix ? `${firstG}-${familia}-${typeSuffix}` : `${firstG}-${familia}`;
  return { categorySlugs, primarySlug, footwearType, garmentType, garmentVariant: appliedVariant };
}
