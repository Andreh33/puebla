/**
 * lib/menu/mega-menu.ts — Estructura tipada del mega-menú del Header.
 *
 * Fuente de verdad del catálogo navegable (Mujer / Hombre / Niño / Niña).
 *
 * Modelo género→familia (Bloque 4):
 *  - Calzado: items → /[seccion]/calzado[?tipo=<footwearType>]. Primer item
 *    "Calzado" general (sin filtro); resto 1:1 con FOOTWEAR_TYPES del Bloque 3.
 *  - Ropa: item general → /[seccion]/textil + sub-items por prenda
 *    (?prenda=<garmentType>, Bloque 7 §7.4).
 *  - Accesorios: NO van en los paneles de género; se navegan desde /accesorios.
 */

import { GARMENT_VARIANT_LABELS, type GarmentVariant } from "@/lib/categories/garment";

/** Géneros soportados por el mega-menú. */
export type MegaMenuGender = "MUJER" | "HOMBRE" | "NINO" | "NINA" | "BEBE";

/**
 * Hoja del menú — dos formas:
 *  - { familia: "calzado", tipo? } → /[seccion]/calzado[?tipo=…]
 *  - { familia: "textil", prenda?, variante? } → /[seccion]/textil[?prenda=…[&variante=…]]
 *
 * `variante` (valor del enum GarmentVariant, p.ej. "manga_corta") marca un
 * sub-item indentado bajo su prenda; el componente lo renderiza con sangría.
 */
export type MegaMenuItem =
  | { label: string; familia: "calzado"; tipo?: string }
  | { label: string; familia: "textil"; prenda?: string; variante?: string };

/** Grupo (Ropa, Calzado) dentro de una sección. */
export type MegaMenuGroup = { title: string; items: MegaMenuItem[] };

/** Sección con su género propio. */
export type MegaMenuSection = {
  gender: MegaMenuGender;
  label: string;
  groups: MegaMenuGroup[];
};

/** Tab raíz del mega-menú (Mujer / Hombre / Niño / Niña / Bebé). */
export type MegaMenuTab = {
  href: "/mujer" | "/hombre" | "/nino" | "/nina" | "/bebe";
  label: string;
  /** Imagen lifestyle sticky en el panel desktop. */
  heroImage: string;
  sections: MegaMenuSection[];
};

/** gender (enum) → seccion (slug del hub /[seccion]). */
const SECCION_BY_GENDER: Record<MegaMenuGender, "mujer" | "hombre" | "nino" | "nina" | "bebe"> = {
  MUJER: "mujer",
  HOMBRE: "hombre",
  NINO: "nino",
  NINA: "nina",
  BEBE: "bebe",
};

// ---------------------------------------------------------------------------
// Grupos compartidos (modelo género→familia uniforme).
// ---------------------------------------------------------------------------

/**
 * Ropa: prendas base del grupo. Cada una filtra por garmentType vía
 * ?prenda=<tipo>; etiquetas y valores coinciden con GARMENT_TYPE_LABELS/
 * GARMENT_TYPES del Bloque 6. Las que admiten variante fina (camiseta,
 * pantalon, mallas) generan sub-items indentados por género (ver buildRopa).
 */
const ROPA_PRENDAS: Array<{ label: string; prenda: string }> = [
  { label: "Camisetas", prenda: "camiseta" },
  { label: "Polos", prenda: "polo" },
  { label: "Sudaderas", prenda: "sudadera" },
  { label: "Polares", prenda: "polar" },
  { label: "Chándal", prenda: "chandal" },
  // "Chaquetas" oculto del megamenú a petición del cliente (los productos siguen
  // en la tienda; reactivar = descomentar la línea):
  // { label: "Chaquetas", prenda: "chaqueta" },
  { label: "Abrigos", prenda: "abrigo" },
  { label: "Cortavientos", prenda: "cortavientos" },
  { label: "Conjuntos", prenda: "conjunto" },
  { label: "Pantalones", prenda: "pantalon" },
  { label: "Mallas y leggins", prenda: "mallas" },
  { label: "Bañadores", prenda: "banador" },
];

/**
 * Variantes finas por prenda, con disponibilidad por género (Feature A).
 * tirantes/top SOLO en mujer y niña; el resto en hombre/mujer/niño/niña.
 * El orden es el de presentación bajo la prenda. Espejo de TEXTIL_VARIANTES en
 * lib/categories/taxonomy-tree.ts.
 */
const PRENDA_VARIANTES: Record<string, Array<{ variante: GarmentVariant; soloGeneros?: MegaMenuGender[] }>> = {
  camiseta: [
    { variante: "manga_corta" },
    { variante: "manga_larga" },
    { variante: "tirantes", soloGeneros: ["MUJER", "NINA"] },
    { variante: "top", soloGeneros: ["MUJER", "NINA"] },
  ],
  pantalon: [
    { variante: "pantalon_corto" },
    { variante: "pantalon_largo" },
  ],
  mallas: [
    { variante: "mallas_cortas" },
    { variante: "mallas_largas" },
    { variante: "mallas_piratas" },
  ],
};

/**
 * Construye el grupo "Ropa" para un género: "Ver toda la ropa" + cada prenda
 * y, justo debajo, sus variantes disponibles para ESE género como sub-items
 * indentados (con `variante` = valor del enum). Bebé no recibe variantes.
 */
function buildRopa(gender: MegaMenuGender): MegaMenuGroup {
  const items: MegaMenuItem[] = [{ label: "Ver toda la ropa", familia: "textil" }];
  for (const { label, prenda } of ROPA_PRENDAS) {
    items.push({ label, familia: "textil", prenda });
    const variantes = PRENDA_VARIANTES[prenda];
    if (!variantes) continue;
    for (const v of variantes) {
      if (v.soloGeneros && !v.soloGeneros.includes(gender)) continue;
      items.push({
        label: GARMENT_VARIANT_LABELS[v.variante],
        familia: "textil",
        prenda,
        variante: v.variante,
      });
    }
  }
  return { title: "Ropa", items };
}

// Grupos "Ropa" precalculados por género. Bebé sin variantes (PRENDA_VARIANTES
// solo añade sub-items a los géneros que lo permiten; para BEBE la guarda
// soloGeneros excluye top/tirantes y el resto igualmente se omite abajo).
const ROPA_HOMBRE = buildRopa("HOMBRE");
const ROPA_MUJER = buildRopa("MUJER");
const ROPA_NINO = buildRopa("NINO");
const ROPA_NINA = buildRopa("NINA");
// Bebé: solo prendas base, sin ninguna variante (espejo de la taxonomía, que
// excluye a bebé de los nodos de 4º nivel).
const ROPA_BEBE: MegaMenuGroup = {
  title: "Ropa",
  items: [
    { label: "Ver toda la ropa", familia: "textil" },
    ...ROPA_PRENDAS.map((p) => ({ label: p.label, familia: "textil" as const, prenda: p.prenda })),
  ],
};

/**
 * Calzado: "Calzado" general primero + un item por footwearType.
 * Orden y `tipo` coinciden con FOOTWEAR_TYPES del Bloque 3.
 */
const CALZADO: MegaMenuGroup = {
  title: "Calzado",
  items: [
    { label: "Ver todo el calzado", familia: "calzado" },
    { label: "Running", familia: "calzado", tipo: "running" },
    { label: "Trail", familia: "calzado", tipo: "trail" },
    // Bloque 8.8: 'Tenis' fusionado en 'Pádel' (footwearType tenis→padel).
    { label: "Tenis/Pádel", familia: "calzado", tipo: "padel" },
    { label: "Fútbol", familia: "calzado", tipo: "futbol" },
    { label: "Fútbol sala", familia: "calzado", tipo: "futbol_sala" },
    { label: "Casual", familia: "calzado", tipo: "casual" },
    { label: "Baloncesto", familia: "calzado", tipo: "baloncesto" },
    { label: "Chanclas", familia: "calzado", tipo: "chanclas" },
  ],
};

// Bloque 8.7 + petición cliente: en MUJER ocultamos "Fútbol", "Fútbol sala" y
// "Baloncesto" (sin demanda local). Reactivar = quitar el tipo de este filtro.
const CALZADO_MUJER: MegaMenuGroup = {
  title: "Calzado",
  items: CALZADO.items.filter(
    (i) =>
      i.familia !== "calzado" ||
      (i.tipo !== "futbol" && i.tipo !== "futbol_sala" && i.tipo !== "baloncesto"),
  ),
};

// ---------------------------------------------------------------------------
// Mega-menú raíz
// ---------------------------------------------------------------------------

export const MEGA_MENU: {
  mujer: MegaMenuTab;
  hombre: MegaMenuTab;
  nino: MegaMenuTab;
  nina: MegaMenuTab;
  bebe: MegaMenuTab;
} = {
  mujer: {
    href: "/mujer",
    label: "Mujer",
    heroImage: "/category-photos/mujer-hero.webp",
    sections: [{ gender: "MUJER", label: "Mujer", groups: [ROPA_MUJER, CALZADO_MUJER] }],
  },
  hombre: {
    href: "/hombre",
    label: "Hombre",
    // Bloque 9: foto real de pádel (antes hombre-hero.webp = hombre en bici).
    heroImage: "/category-photos/padel-hombre.jpg",
    sections: [{ gender: "HOMBRE", label: "Hombre", groups: [ROPA_HOMBRE, CALZADO] }],
  },
  nino: {
    href: "/nino",
    label: "Niño",
    heroImage: "/category-photos/ninos-hero.webp",
    sections: [{ gender: "NINO", label: "Niño", groups: [ROPA_NINO, CALZADO] }],
  },
  nina: {
    href: "/nina",
    label: "Niña",
    // Bloque 9: foto propia de niña (antes compartía ninos-hero.webp = niños).
    heroImage: "/category-photos/nina-hero.jpg",
    sections: [{ gender: "NINA", label: "Niña", groups: [ROPA_NINA, CALZADO] }],
  },
  bebe: {
    href: "/bebe",
    label: "Bebé",
    heroImage: "/category-photos/ninos-hero.jpg",
    sections: [{ gender: "BEBE", label: "Bebé", groups: [ROPA_BEBE, CALZADO] }],
  },
};

export type MegaMenuKey = keyof typeof MEGA_MENU;
export const MEGA_MENU_KEYS: MegaMenuKey[] = ["mujer", "hombre", "nino", "nina", "bebe"];

/**
 * Construye la URL navegable de un item del mega-menú:
 *  - calzado → /[seccion]/calzado[?tipo=…]
 *  - textil  → /[seccion]/textil[?prenda=…[&variante=…]]
 */
export function buildMegaMenuHref(item: MegaMenuItem, gender: MegaMenuGender): string {
  const seccion = SECCION_BY_GENDER[gender];
  if (item.familia === "calzado") {
    return item.tipo ? `/${seccion}/calzado?tipo=${item.tipo}` : `/${seccion}/calzado`;
  }
  if (!item.prenda) return `/${seccion}/textil`;
  return item.variante
    ? `/${seccion}/textil?prenda=${item.prenda}&variante=${item.variante}`
    : `/${seccion}/textil?prenda=${item.prenda}`;
}
