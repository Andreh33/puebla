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

/** Géneros soportados por el mega-menú. */
export type MegaMenuGender = "MUJER" | "HOMBRE" | "NINO" | "NINA";

/**
 * Hoja del menú — dos formas:
 *  - { familia: "calzado", tipo? } → /[seccion]/calzado[?tipo=…]
 *  - { familia: "textil" }         → /[seccion]/textil
 */
export type MegaMenuItem =
  | { label: string; familia: "calzado"; tipo?: string }
  | { label: string; familia: "textil"; prenda?: string };

/** Grupo (Ropa, Calzado) dentro de una sección. */
export type MegaMenuGroup = { title: string; items: MegaMenuItem[] };

/** Sección con su género propio. */
export type MegaMenuSection = {
  gender: MegaMenuGender;
  label: string;
  groups: MegaMenuGroup[];
};

/** Tab raíz del mega-menú (Mujer / Hombre / Niño / Niña). */
export type MegaMenuTab = {
  href: "/mujer" | "/hombre" | "/nino" | "/nina";
  label: string;
  /** Imagen lifestyle sticky en el panel desktop. */
  heroImage: string;
  sections: MegaMenuSection[];
};

/** gender (enum) → seccion (slug del hub /[seccion]). */
const SECCION_BY_GENDER: Record<MegaMenuGender, "mujer" | "hombre" | "nino" | "nina"> = {
  MUJER: "mujer",
  HOMBRE: "hombre",
  NINO: "nino",
  NINA: "nina",
};

// ---------------------------------------------------------------------------
// Grupos compartidos (modelo género→familia uniforme).
// ---------------------------------------------------------------------------

/**
 * Ropa: enlace general al textil + sub-categorías por prenda (Bloque 7 §7.4).
 * Cada sub-item filtra por garmentType vía ?prenda=<tipo>; etiquetas y valores
 * coinciden con GARMENT_TYPE_LABELS/GARMENT_TYPES del Bloque 6.
 */
const ROPA: MegaMenuGroup = {
  title: "Ropa",
  items: [
    { label: "Ver toda la ropa", familia: "textil" },
    { label: "Camisetas y polos", familia: "textil", prenda: "camiseta" },
    { label: "Sudaderas", familia: "textil", prenda: "sudadera" },
    { label: "Chándal", familia: "textil", prenda: "chandal" },
    { label: "Pantalones", familia: "textil", prenda: "pantalon" },
    { label: "Mallas", familia: "textil", prenda: "mallas" },
    { label: "Bañadores", familia: "textil", prenda: "banador" },
  ],
};

/**
 * Calzado: "Calzado" general primero + un item por footwearType.
 * Orden y `tipo` coinciden con FOOTWEAR_TYPES del Bloque 3.
 */
const CALZADO: MegaMenuGroup = {
  title: "Calzado",
  items: [
    { label: "Calzado", familia: "calzado" },
    { label: "Running", familia: "calzado", tipo: "running" },
    { label: "Trail", familia: "calzado", tipo: "trail" },
    // Bloque 8.8: 'Tenis' fusionado en 'Pádel' (footwearType tenis→padel).
    { label: "Pádel", familia: "calzado", tipo: "padel" },
    { label: "Fútbol", familia: "calzado", tipo: "futbol" },
    { label: "Fútbol sala", familia: "calzado", tipo: "futbol_sala" },
    { label: "Casual", familia: "calzado", tipo: "casual" },
    { label: "Baloncesto", familia: "calzado", tipo: "baloncesto" },
    { label: "Chanclas", familia: "calzado", tipo: "chanclas" },
  ],
};

// Bloque 8.7: en MUJER ocultamos "Fútbol sala" y "Baloncesto" (sin demanda local).
// Reactivar = usar CALZADO directamente en la sección mujer (quitar este filtro).
const CALZADO_MUJER: MegaMenuGroup = {
  title: "Calzado",
  items: CALZADO.items.filter(
    (i) => i.familia !== "calzado" || (i.tipo !== "futbol_sala" && i.tipo !== "baloncesto"),
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
} = {
  mujer: {
    href: "/mujer",
    label: "Mujer",
    heroImage: "/category-photos/mujer-hero.webp",
    sections: [{ gender: "MUJER", label: "Mujer", groups: [ROPA, CALZADO_MUJER] }],
  },
  hombre: {
    href: "/hombre",
    label: "Hombre",
    // Bloque 9: foto real de pádel (antes hombre-hero.webp = hombre en bici).
    heroImage: "/category-photos/padel-hombre.jpg",
    sections: [{ gender: "HOMBRE", label: "Hombre", groups: [ROPA, CALZADO] }],
  },
  nino: {
    href: "/nino",
    label: "Niño",
    heroImage: "/category-photos/ninos-hero.webp",
    sections: [{ gender: "NINO", label: "Niño", groups: [ROPA, CALZADO] }],
  },
  nina: {
    href: "/nina",
    label: "Niña",
    heroImage: "/category-photos/ninos-hero.webp",
    sections: [{ gender: "NINA", label: "Niña", groups: [ROPA, CALZADO] }],
  },
};

export type MegaMenuKey = keyof typeof MEGA_MENU;
export const MEGA_MENU_KEYS: MegaMenuKey[] = ["mujer", "hombre", "nino", "nina"];

/**
 * Construye la URL navegable de un item del mega-menú:
 *  - calzado → /[seccion]/calzado[?tipo=…]
 *  - textil  → /[seccion]/textil[?prenda=…]
 */
export function buildMegaMenuHref(item: MegaMenuItem, gender: MegaMenuGender): string {
  const seccion = SECCION_BY_GENDER[gender];
  if (item.familia === "calzado") {
    return item.tipo ? `/${seccion}/calzado?tipo=${item.tipo}` : `/${seccion}/calzado`;
  }
  return item.prenda ? `/${seccion}/textil?prenda=${item.prenda}` : `/${seccion}/textil`;
}
