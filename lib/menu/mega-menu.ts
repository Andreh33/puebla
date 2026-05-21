/**
 * lib/menu/mega-menu.ts — Estructura tipada del mega-menú del Header.
 *
 * Es la fuente de verdad del catálogo navegable (Mujer / Hombre / Niño / Niña).
 *
 * Bloque 4 paso e — migrado al modelo género→familia:
 *  - Calzado (C1): items → `/[seccion]/calzado?tipo=<footwearType>`. El primer
 *    item es "Calzado" general (sin filtro). El resto mapea 1:1 con
 *    FOOTWEAR_TYPES del Bloque 3 (running, trail, tenis, padel, futbol,
 *    futbol_sala, casual, baloncesto, chanclas). El antiguo "tenis-padel"
 *    combinado se desdobló en Tenis + Pádel.
 *  - Ropa (R2-colapsado): un solo item → `/[seccion]/textil`. La granularidad
 *    por prenda se recuperará con `garmentType` (ver docs/BLOCK-4-PLAN.md §10).
 *  - Accesorios: se MANTIENEN los slugs legacy (`/[slug]?genero=`), que
 *    aterrizan vía RedirectRule del Bloque 2. `/accesorios` no se reestructura
 *    en Bloque 4 (decisión §3e).
 *
 * La sección combinada `ninos` se eliminó: niño y niña son hubs independientes.
 */

/** Géneros soportados por el mega-menú. */
export type MegaMenuGender = "MUJER" | "HOMBRE" | "NINO" | "NINA";

/**
 * Hoja del menú — tres formas:
 *  - `{ familia: "calzado", tipo? }` → `/[seccion]/calzado[?tipo=…]`
 *  - `{ familia: "textil" }`         → `/[seccion]/textil`
 *  - `{ slug }`                      → legacy `/[slug]?genero=…` (accesorios)
 */
export type MegaMenuItem =
  | { label: string; familia: "calzado"; tipo?: string }
  | { label: string; familia: "textil" }
  | { label: string; slug: string };

/** Grupo (Ropa, Calzado, Accesorios) dentro de una sección. */
export type MegaMenuGroup = { title: string; items: MegaMenuItem[] };

/** Sección con su género propio. */
export type MegaMenuSection = {
  gender: MegaMenuGender;
  /** Label visible cuando hay varias secciones. */
  label: string;
  groups: MegaMenuGroup[];
};

/** Tab raíz del mega-menú (Mujer / Hombre / Niño / Niña). */
export type MegaMenuTab = {
  /** Slug del landing (`/mujer`, `/hombre`, `/nino`, `/nina`). */
  href: "/mujer" | "/hombre" | "/nino" | "/nina";
  label: string;
  /** Imagen lifestyle sticky en el panel desktop. */
  heroImage: string;
  /** Géneros incluidos en este tab. */
  sections: MegaMenuSection[];
  /**
   * Accesorios compartidos (reservado para tabs multi-sección). Hoy ningún tab
   * lo usa — niño y niña son tabs independientes. Se conserva el campo opcional
   * por compatibilidad con el render de MegaMenu.tsx.
   */
  sharedAccessories?: MegaMenuGroup;
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

/** Ropa (R2-colapsado): un único enlace al textil de la sección. */
const ROPA: MegaMenuGroup = {
  title: "Ropa",
  items: [{ label: "Ver toda la ropa", familia: "textil" }],
};

/**
 * Calzado (C1): "Calzado" general primero + un item por footwearType.
 * Orden y `tipo` coinciden con FOOTWEAR_TYPES del Bloque 3.
 */
const CALZADO: MegaMenuGroup = {
  title: "Calzado",
  items: [
    { label: "Calzado", familia: "calzado" },
    { label: "Running", familia: "calzado", tipo: "running" },
    { label: "Trail", familia: "calzado", tipo: "trail" },
    { label: "Tenis", familia: "calzado", tipo: "tenis" },
    { label: "Pádel", familia: "calzado", tipo: "padel" },
    { label: "Fútbol", familia: "calzado", tipo: "futbol" },
    { label: "Fútbol sala", familia: "calzado", tipo: "futbol_sala" },
    { label: "Casual", familia: "calzado", tipo: "casual" },
    { label: "Baloncesto", familia: "calzado", tipo: "baloncesto" },
    { label: "Chanclas", familia: "calzado", tipo: "chanclas" },
  ],
};

/**
 * Accesorios (legacy, sin reestructurar): slugs antiguos que redirigen vía
 * RedirectRule del Bloque 2. Se mantienen idénticos al menú original.
 */
const ACCESORIOS_ADULTO: MegaMenuGroup = {
  title: "Accesorios",
  items: [
    { label: "Gorras", slug: "gorras" },
    { label: "Calcetines", slug: "calcetines" },
    { label: "Mochilas", slug: "mochilas" },
    { label: "Billeteros", slug: "billeteros" },
    { label: "Riñoneras", slug: "rinoneras" },
    { label: "Bolsos", slug: "bolsos" },
    { label: "Gafas de natación", slug: "gafas-natacion" },
    { label: "Guantes", slug: "guantes" },
    { label: "Balones", slug: "balones" },
    { label: "Palas de pádel", slug: "palas-padel" },
  ],
};

/** Accesorios de niños — mismo set que adulto (taxonomía del cliente). */
const ACCESORIOS_NINOS: MegaMenuGroup = {
  title: "Accesorios",
  items: [
    { label: "Gorras", slug: "gorras" },
    { label: "Calcetines", slug: "calcetines" },
    { label: "Mochilas", slug: "mochilas" },
    { label: "Billeteros", slug: "billeteros" },
    { label: "Riñoneras", slug: "rinoneras" },
    { label: "Bolsos", slug: "bolsos" },
    { label: "Gafas de natación", slug: "gafas-natacion" },
    { label: "Guantes", slug: "guantes" },
    { label: "Balones", slug: "balones" },
    { label: "Palas de pádel", slug: "palas-padel" },
  ],
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
    sections: [
      {
        gender: "MUJER",
        label: "Mujer",
        groups: [ROPA, CALZADO, ACCESORIOS_ADULTO],
      },
    ],
  },
  hombre: {
    href: "/hombre",
    label: "Hombre",
    heroImage: "/category-photos/hombre-hero.webp",
    sections: [
      {
        gender: "HOMBRE",
        label: "Hombre",
        groups: [ROPA, CALZADO, ACCESORIOS_ADULTO],
      },
    ],
  },
  nino: {
    href: "/nino",
    label: "Niño",
    heroImage: "/category-photos/ninos-hero.webp",
    sections: [
      {
        gender: "NINO",
        label: "Niño",
        groups: [ROPA, CALZADO, ACCESORIOS_NINOS],
      },
    ],
  },
  nina: {
    href: "/nina",
    label: "Niña",
    heroImage: "/category-photos/ninos-hero.webp",
    sections: [
      {
        gender: "NINA",
        label: "Niña",
        groups: [ROPA, CALZADO, ACCESORIOS_NINOS],
      },
    ],
  },
};

export type MegaMenuKey = keyof typeof MEGA_MENU;
export const MEGA_MENU_KEYS: MegaMenuKey[] = ["mujer", "hombre", "nino", "nina"];

/**
 * Construye la URL navegable de un item del mega-menú según su forma:
 *  - calzado → `/[seccion]/calzado[?tipo=…]` (modelo género→familia, Bloque 4).
 *  - textil  → `/[seccion]/textil`.
 *  - legacy slug → `/[slug]?genero=…` (accesorios; redirige vía RedirectRule).
 */
export function buildMegaMenuHref(item: MegaMenuItem, gender: MegaMenuGender): string {
  const seccion = SECCION_BY_GENDER[gender];
  if ("familia" in item) {
    if (item.familia === "calzado") {
      return item.tipo ? `/${seccion}/calzado?tipo=${item.tipo}` : `/${seccion}/calzado`;
    }
    return `/${seccion}/textil`;
  }
  return `/${item.slug}?genero=${gender}`;
}

/**
 * Slugs legacy únicos referenciados por el mega-menú (solo accesorios; el
 * calzado/textil ya no usan slug). Útil para mantener aliases en
 * `lib/public-queries.ts`. Hoy sin consumidores directos.
 */
export function getAllMegaMenuSlugs(): string[] {
  const out = new Set<string>();
  for (const key of MEGA_MENU_KEYS) {
    for (const section of MEGA_MENU[key].sections) {
      for (const group of section.groups) {
        for (const item of group.items) {
          if ("slug" in item) out.add(item.slug);
        }
      }
    }
  }
  return Array.from(out).sort();
}
