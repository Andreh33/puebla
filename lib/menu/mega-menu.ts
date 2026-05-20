/**
 * lib/menu/mega-menu.ts — Estructura tipada del mega-menú del Header.
 *
 * Es la fuente de verdad del catálogo navegable (Mujer / Hombre / Niños).
 * Cada `slug` se reusa para la ruta `/${slug}?genero=${gender}` y se mapea con
 * un alias en `lib/public-queries.ts` para que la página `/${slug}` devuelva
 * 200 aunque la categoría aún no exista en BD.
 *
 * Importante:
 *  - Los nombres y orden coinciden literalmente con la taxonomía entregada por
 *    el cliente. NO cambiar sin pedir confirmación.
 *  - Los slugs son kebab-case sin acentos para alinearse con el resolver
 *    público (`getCategoryBySlug` → fallback demo).
 */

/** Géneros soportados por el mega-menú (subconjunto del enum `DemoGender`). */
export type MegaMenuGender = "MUJER" | "HOMBRE" | "NINO" | "NINA";

/** Hoja del menú: una sub-categoría con su slug y label visible. */
export type MegaMenuItem = { label: string; slug: string };

/** Grupo (Ropa, Calzado, Accesorios) dentro de una sección. */
export type MegaMenuGroup = { title: string; items: MegaMenuItem[] };

/** Sección con su género propio (en Niños hay dos: NINO y NINA). */
export type MegaMenuSection = {
  gender: MegaMenuGender;
  /** Label visible cuando hay varias secciones (ej. "Niño", "Niña"). */
  label: string;
  groups: MegaMenuGroup[];
};

/** Tab raíz del mega-menú (Mujer / Hombre / Niño / Niña). */
export type MegaMenuTab = {
  /** Slug del landing (`/mujer`, `/hombre`, `/nino`, `/nina`, `/ninos`). */
  href: "/mujer" | "/hombre" | "/ninos" | "/nino" | "/nina";
  label: string;
  /** Imagen lifestyle sticky en el panel desktop. */
  heroImage: string;
  /** Géneros incluidos en este tab (Niños incluye NINO y NINA). */
  sections: MegaMenuSection[];
  /**
   * Accesorios compartidos en el caso de "Niños". Para Mujer/Hombre los
   * accesorios viven dentro de la única sección del tab. Cuando hay más de
   * una sección (Niños), los accesorios se renderizan en una fila adicional
   * común para no duplicar UI.
   */
  sharedAccessories?: MegaMenuGroup;
};

// ---------------------------------------------------------------------------
// Grupos reutilizables (Mujer y Hombre comparten estructura idéntica).
// ---------------------------------------------------------------------------

const ROPA_ADULTO: MegaMenuGroup = {
  title: "Ropa",
  items: [
    { label: "Chándal", slug: "chandal" },
    { label: "Abrigos", slug: "abrigos" },
    { label: "Cortavientos", slug: "cortavientos" },
    { label: "Polos", slug: "polos" },
    { label: "Pantalones", slug: "pantalones" },
    { label: "Camisetas", slug: "camisetas" },
    { label: "Sudaderas", slug: "sudaderas" },
    { label: "Mallas", slug: "mallas" },
    { label: "Conjuntos", slug: "conjuntos" },
    { label: "Bañadores", slug: "banadores" },
  ],
};

const CALZADO_ADULTO: MegaMenuGroup = {
  title: "Calzado",
  items: [
    { label: "Tenis / Pádel", slug: "tenis-padel" },
    { label: "Running", slug: "running" },
    { label: "Trail", slug: "trail" },
    { label: "Casual", slug: "casual" },
    { label: "Baloncesto", slug: "baloncesto" },
    { label: "Fútbol", slug: "futbol" },
    { label: "Fútbol Sala", slug: "futbol-sala" },
    { label: "Chanclas", slug: "chanclas" },
  ],
};

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

const ROPA_NINO: MegaMenuGroup = {
  title: "Ropa Niño",
  items: [
    { label: "Chándal", slug: "chandal" },
    { label: "Abrigos", slug: "abrigos" },
    { label: "Pantalones", slug: "pantalones" },
    { label: "Camisetas", slug: "camisetas" },
    { label: "Sudaderas", slug: "sudaderas" },
    { label: "Mallas", slug: "mallas" },
    { label: "Conjuntos", slug: "conjuntos" },
    { label: "Bañadores", slug: "banadores" },
  ],
};

const CALZADO_NINO: MegaMenuGroup = {
  title: "Calzado Niño",
  items: [
    { label: "Tenis / Pádel", slug: "tenis-padel" },
    { label: "Running", slug: "running" },
    { label: "Trail", slug: "trail" },
    { label: "Casual", slug: "casual" },
    { label: "Baloncesto", slug: "baloncesto" },
    { label: "Fútbol", slug: "futbol" },
    { label: "Fútbol Sala", slug: "futbol-sala" },
    { label: "Chanclas", slug: "chanclas" },
  ],
};

const ROPA_NINA: MegaMenuGroup = {
  title: "Ropa Niña",
  items: [
    { label: "Chándal", slug: "chandal" },
    { label: "Abrigos", slug: "abrigos" },
    { label: "Camisetas", slug: "camisetas" },
    { label: "Sudaderas", slug: "sudaderas" },
    { label: "Mallas", slug: "mallas" },
    { label: "Conjuntos", slug: "conjuntos" },
    { label: "Bebé", slug: "bebe" },
  ],
};

const CALZADO_NINA: MegaMenuGroup = {
  title: "Calzado Niña",
  items: [
    { label: "Tenis / Pádel", slug: "tenis-padel" },
    { label: "Running", slug: "running" },
    { label: "Trail", slug: "trail" },
    { label: "Casual", slug: "casual" },
    { label: "Fútbol", slug: "futbol" },
    { label: "Fútbol Sala", slug: "futbol-sala" },
    { label: "Chanclas", slug: "chanclas" },
  ],
};

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
  ninos: MegaMenuTab;
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
        groups: [ROPA_ADULTO, CALZADO_ADULTO, ACCESORIOS_ADULTO],
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
        groups: [ROPA_ADULTO, CALZADO_ADULTO, ACCESORIOS_ADULTO],
      },
    ],
  },
  ninos: {
    href: "/ninos",
    label: "Niños",
    heroImage: "/category-photos/ninos-hero.webp",
    sections: [
      {
        gender: "NINO",
        label: "Niño",
        groups: [ROPA_NINO, CALZADO_NINO],
      },
      {
        gender: "NINA",
        label: "Niña",
        groups: [ROPA_NINA, CALZADO_NINA],
      },
    ],
    // Accesorios comunes para ambos sub-géneros. Se renderizan en una fila
    // independiente debajo de las dos columnas de ropa/calzado.
    sharedAccessories: ACCESORIOS_NINOS,
  },
  // Niño y Niña como tabs independientes con su propio mega-menú (a
  // petición del cliente: misma experiencia desplegable que Mujer/Hombre,
  // no links planos). Cada uno con una sección única (ROPA + CALZADO +
  // ACCESORIOS) en lugar de la versión combinada "ninos".
  nino: {
    href: "/nino",
    label: "Niño",
    heroImage: "/category-photos/ninos-hero.webp",
    sections: [
      {
        gender: "NINO",
        label: "Niño",
        groups: [ROPA_NINO, CALZADO_NINO, ACCESORIOS_NINOS],
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
        groups: [ROPA_NINA, CALZADO_NINA, ACCESORIOS_NINOS],
      },
    ],
  },
};

export type MegaMenuKey = keyof typeof MEGA_MENU;
// El header usa mujer/hombre/nino/nina (el combinado "ninos" queda
// definido por compat con /ninos pero no se dispara desde el header).
export const MEGA_MENU_KEYS: MegaMenuKey[] = ["mujer", "hombre", "nino", "nina"];

/**
 * Construye la URL navegable para un item del mega-menú.
 *
 * Convención: `/${slug}?genero=${gender}` — el filtro `GenderChips` de la
 * página de categoría ya entiende el `genero` query param.
 */
export function buildMegaMenuHref(slug: string, gender: MegaMenuGender): string {
  return `/${slug}?genero=${gender}`;
}

/**
 * Devuelve todos los slugs únicos referenciados por el mega-menú. Útil para
 * generar aliases en `lib/public-queries.ts` y mantener la coherencia.
 */
export function getAllMegaMenuSlugs(): string[] {
  const out = new Set<string>();
  for (const key of MEGA_MENU_KEYS) {
    const tab = MEGA_MENU[key];
    for (const section of tab.sections) {
      for (const group of section.groups) {
        for (const item of group.items) out.add(item.slug);
      }
    }
    if (tab.sharedAccessories) {
      for (const item of tab.sharedAccessories.items) out.add(item.slug);
    }
  }
  return Array.from(out).sort();
}
