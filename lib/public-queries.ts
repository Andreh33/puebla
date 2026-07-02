import { db, type Prisma } from "@/lib/db";
import {
  getDemoBrands,
  getDemoCategories,
  getDemoProductsByGender,
  type DemoGender,
} from "@/lib/demo-products";
import { VARIANT_TO_TYPE, type GarmentVariant } from "@/lib/categories/garment";
import { IN_STOCK_WHERE } from "@/lib/products/in-stock";

// ---------------------------------------------------------------------------
// Alias de categorías "comerciales" â†’ subsets del catálogo demo
//
// La home muestra siempre /running, /padel, /montana, /calzado como entradas
// destacadas aunque la BD esté vacía. Mapeamos esos slugs comerciales a
// subsets temáticos del catálogo demo para que sus páginas no devuelvan 404.
// ---------------------------------------------------------------------------

const DEMO_CATEGORY_ALIASES: Record<
  string,
  { name: string; categorySlugs: string[] }
> = {
  running: { name: "Running", categorySlugs: ["zapatilla", "camiseta-mcorta", "malla", "short-poliester"] },
  padel: { name: "Pádel", categorySlugs: ["zapatilla", "camiseta-mcorta", "short-poliester"] },
  montana: {
    name: "Montaña",
    categorySlugs: [
      "bota-alta",
      "anorack-treking",
      "anorack-cazadora",
      "anorack-parka",
      "chubasquero",
      "polar-poliester",
      "pantalon-aventura",
      "pantalon-nieve",
    ],
  },
  calzado: { name: "Calzado", categorySlugs: ["zapatilla", "bota-alta"] },

  // --- Taxonomía del mega-menú (Mujer / Hombre / Niños) ----------------
  // Cada slug devuelve 200 aunque no haya productos: la categoría se
  // resuelve por alias y el listado cae al subset del catálogo demo más
  // cercano por heurística. Donde no hay match natural, `categorySlugs`
  // queda vacío y la página muestra el estado "sin productos todavía".
  //
  // ROPA
  chandal: {
    name: "Chándal",
    categorySlugs: ["traje-jogging", "traje-entrenamiento-poliester"],
  },
  abrigos: {
    name: "Abrigos",
    categorySlugs: ["anorack-treking", "anorack-cazadora", "anorack-parka", "chubasquero"],
  },
  cortavientos: { name: "Cortavientos", categorySlugs: ["chubasquero"] },
  polos: { name: "Polos", categorySlugs: ["camiseta-mcorta"] },
  pantalones: {
    name: "Pantalones",
    categorySlugs: ["pantalon-poliester", "pantalon-aventura", "pantalon-nieve"],
  },
  camisetas: {
    name: "Camisetas",
    categorySlugs: ["camiseta-mcorta", "camiseta-mlarga"],
  },
  sudaderas: { name: "Sudaderas", categorySlugs: ["sudadera"] },
  mallas: { name: "Mallas", categorySlugs: ["malla"] },
  conjuntos: {
    name: "Conjuntos",
    categorySlugs: ["traje-jogging", "traje-entrenamiento-poliester"],
  },
  banadores: { name: "Bañadores", categorySlugs: ["short-poliester"] },

  // CALZADO
  "tenis-padel": { name: "Tenis / Pádel", categorySlugs: ["zapatilla"] },
  trail: { name: "Trail", categorySlugs: ["zapatilla", "bota-alta"] },
  baloncesto: { name: "Baloncesto", categorySlugs: ["zapatilla"] },
  futbol: { name: "Fútbol", categorySlugs: ["zapatilla"] },
  "futbol-sala": { name: "Fútbol Sala", categorySlugs: ["zapatilla"] },
  chanclas: { name: "Chanclas", categorySlugs: ["zapatilla"] },

  // ACCESORIOS â€” sin match en el catálogo demo todavía. La página renderiza
  // hero + categoría + estado "Pronto en tienda".
  gorras: { name: "Gorras", categorySlugs: [] },
  calcetines: { name: "Calcetines", categorySlugs: [] },
  mochilas: { name: "Mochilas", categorySlugs: [] },
  billeteros: { name: "Billeteros", categorySlugs: [] },
  rinoneras: { name: "Riñoneras", categorySlugs: [] },
  bolsos: { name: "Bolsos", categorySlugs: [] },
  "gafas-natacion": { name: "Gafas de natación", categorySlugs: [] },
  guantes: { name: "Guantes", categorySlugs: [] },
  balones: { name: "Balones", categorySlugs: [] },
  "palas-padel": { name: "Palas de pádel", categorySlugs: [] },

  // Mantenemos coherencia con los slugs que sí están directamente en el demo.
};

// ---------------------------------------------------------------------------
// Datos públicos: real-or-demo fallback
//
// Estas funciones intentan leer la base de datos real (Prisma â†’ Neon). Si la
// BD no está aprovisionada o falla por cualquier motivo, devuelven productos
// del catálogo de demo que vive en `lib/demo-products.ts` para que la web
// luzca con artículos reales (con imágenes) mientras el cliente termina de
// configurar la BD. Cuando haya productos publicados, los reales tienen
// prioridad y los demo desaparecen automáticamente.
// ---------------------------------------------------------------------------

/**
 * Shape común esperado por `ProductCard` y por los listados públicos. Es un
 * superconjunto de los campos seleccionados desde Prisma.
 */
export type PublicProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  colorName: string;
  mainImageUrl: string | null;
  retailPrice: number;
  salePrice: number | null;
  source: "LOCAL" | "MIRAVIA" | "AMAZON";
  brand: { name: string; slug: string };
  isDemo?: boolean;
};

// Selección estándar para tarjetas en listados.
const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  colorName: true,
  mainImageUrl: true,
  retailPrice: true,
  salePrice: true,
  source: true,
  brand: { select: { name: true, slug: true } },
} satisfies Prisma.ProductSelect;

/**
 * Productos destacados para la home. Real â†’ fallback demo (8 ítems).
 */
export async function getFeaturedProducts(limit = 8): Promise<PublicProductCardData[]> {
  try {
    // 1) Destacados manuales (isFeatured). 2) Si faltan para llegar a `limit`,
    // completar con productos ACTIVE recientes (sin duplicar). NUNCA caer a demo
    // en runtime: los slugs demo no existen en BD y daban 404 en la ficha (Bug A).
    const featured = await db.product.findMany({
      where: { status: "ACTIVE", isFeatured: true, ...IN_STOCK_WHERE },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
      select: productCardSelect,
    });
    let list = featured;
    if (featured.length < limit) {
      const excludeIds = featured.map((p) => p.id);
      const recent = await db.product.findMany({
        where: { status: "ACTIVE", id: { notIn: excludeIds }, ...IN_STOCK_WHERE },
        orderBy: [{ updatedAt: "desc" }],
        take: limit - featured.length,
        select: productCardSelect,
      });
      list = [...featured, ...recent];
    }
    return list.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortName: p.shortName,
      colorName: p.colorName,
      mainImageUrl: p.mainImageUrl,
      retailPrice: Number(p.retailPrice),
      salePrice: p.salePrice != null ? Number(p.salePrice) : null,
      source: p.source,
      brand: p.brand,
    }));
  } catch (err) {
    console.warn("getFeaturedProducts error:", (err as Error).message);
    return []; // home muestra estado vacío con gracia; nunca slugs demo (404)
  }
}

/**
 * Productos por categoría (slug). Devuelve datos paginados.
 */
export async function getCategoryProducts(opts: {
  categorySlug: string;
  where?: Prisma.ProductWhereInput;
  skip?: number;
  take?: number;
}): Promise<{ products: PublicProductCardData[]; total: number; isDemo: boolean }> {
  const take = opts.take ?? 12;
  const skip = opts.skip ?? 0;
  try {
    const where: Prisma.ProductWhereInput = opts.where ?? { status: "ACTIVE", ...IN_STOCK_WHERE };
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        skip,
        take,
        select: productCardSelect,
      }),
      db.product.count({ where }),
    ]);
    if (products.length > 0 || total > 0) {
      return {
        products: products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          shortName: p.shortName,
          colorName: p.colorName,
          mainImageUrl: p.mainImageUrl,
          retailPrice: Number(p.retailPrice),
          salePrice: p.salePrice != null ? Number(p.salePrice) : null,
          source: p.source,
          brand: p.brand,
        })),
        total,
        isDemo: false,
      };
    }
  } catch (err) {
    console.warn(
      `[categoria] getCategoryProducts(${opts.categorySlug}) sin BD:`,
      (err as Error).message,
    );
  }
  // Sin productos reales: NO caemos a tarjetas demo — sus slugs no existen en BD
  // y enlazan a /producto/<slug> que da 404 (Bug A). Devolvemos lista vacía y la
  // página renderiza su estado "sin productos todavía". Cuando el cliente
  // publique catálogo ACTIVE, estos listados se pueblan solos.
  return { products: [], total: 0, isDemo: false };
}

/**
 * Productos por marca (slug). Devuelve datos paginados.
 */
export async function getBrandProducts(opts: {
  brandSlug: string;
  skip?: number;
  take?: number;
}): Promise<{ products: PublicProductCardData[]; total: number; isDemo: boolean }> {
  const take = opts.take ?? 12;
  const skip = opts.skip ?? 0;
  try {
    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE",
      ...IN_STOCK_WHERE,
      brand: { is: { slug: opts.brandSlug } },
    };
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        skip,
        take,
        select: productCardSelect,
      }),
      db.product.count({ where }),
    ]);
    if (products.length > 0 || total > 0) {
      return {
        products: products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          shortName: p.shortName,
          colorName: p.colorName,
          mainImageUrl: p.mainImageUrl,
          retailPrice: Number(p.retailPrice),
          salePrice: p.salePrice != null ? Number(p.salePrice) : null,
          source: p.source,
          brand: p.brand,
        })),
        total,
        isDemo: false,
      };
    }
  } catch (err) {
    console.warn(
      `[marca] getBrandProducts(${opts.brandSlug}) sin BD:`,
      (err as Error).message,
    );
  }
  // Sin productos reales: lista vacía en lugar de tarjetas demo (sus slugs dan
  // 404 en la ficha). La página de marca muestra su estado vacío con gracia.
  return { products: [], total: 0, isDemo: false };
}

/**
 * Productos filtrados por género (HOMBRE / MUJER / NINO …). Real â†’ demo.
 *
 * Para HOMBRE y MUJER se incluyen también los productos UNISEX, alineado con
 * la convención de retailers como Decathlon o Nike (un producto unisex aparece
 * en las dos secciones de género). Para NINO/NINA/BEBE solo se devuelven los
 * que coincidan estrictamente.
 */
export async function getProductsByGender(opts: {
  gender: DemoGender;
  take?: number;
  skip?: number;
}): Promise<{ products: PublicProductCardData[]; total: number; isDemo: boolean }> {
  const take = opts.take ?? 8;
  const skip = opts.skip ?? 0;
  try {
    const includeUnisex = opts.gender === "HOMBRE" || opts.gender === "MUJER";
    const genderFilter = includeUnisex
      ? { in: [opts.gender, "UNISEX"] as DemoGender[] }
      : { equals: opts.gender };
    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE",
      ...IN_STOCK_WHERE,
      gender: genderFilter as never,
    };
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        skip,
        take,
        select: productCardSelect,
      }),
      db.product.count({ where }),
    ]);
    if (products.length > 0 || total > 0) {
      return {
        products: products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          shortName: p.shortName,
          colorName: p.colorName,
          mainImageUrl: p.mainImageUrl,
          retailPrice: Number(p.retailPrice),
          salePrice: p.salePrice != null ? Number(p.salePrice) : null,
          source: p.source,
          brand: p.brand,
        })),
        total,
        isDemo: false,
      };
    }
  } catch (err) {
    console.warn(
      `[genero] getProductsByGender(${opts.gender}) sin BD:`,
      (err as Error).message,
    );
  }
  // Sin productos reales: lista vacía en lugar de tarjetas demo (sus slugs dan
  // 404 en la ficha). La landing de género muestra su estado vacío con gracia.
  return { products: [], total: 0, isDemo: false };
}

/**
 * Categorías presentes en el catálogo demo para un género dado. Ãštil para la
 * sección "Categorías" de las landings /mujer /hombre /ninos. Si no hay BD
 * real, deduce las categorías a partir del demo filtrado por género.
 */
export async function getCategoriesByGender(g: DemoGender): Promise<
  Array<{ name: string; slug: string; productCount: number; imageUrl: string | null }>
> {
  try {
    const includeUnisex = g === "HOMBRE" || g === "MUJER";
    const genderValues = includeUnisex ? [g, "UNISEX"] : [g];
    const real = await db.category.findMany({
      where: {
        products: {
          some: {
            status: "ACTIVE",
            gender: { in: genderValues as never },
          },
        },
      },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        _count: {
          select: {
            products: {
              where: {
                status: "ACTIVE",
                gender: { in: genderValues as never },
              },
            },
          },
        },
      },
    });
    if (real.length > 0) {
      return real.map((c) => ({
        name: c.name,
        slug: c.slug,
        productCount: c._count.products,
        imageUrl: c.imageUrl,
      }));
    }
  } catch (err) {
    console.warn(
      `[demo] getCategoriesByGender(${g}) â†’ fallback demo:`,
      (err as Error).message,
    );
  }
  // Fallback demo: agrupar productos filtrados por género en categorías.
  const subset = getDemoProductsByGender(g);
  const map = new Map<string, { name: string; slug: string; productCount: number; imageUrl: string | null }>();
  for (const p of subset) {
    const existing = map.get(p.category.slug);
    if (existing) {
      existing.productCount += 1;
    } else {
      map.set(p.category.slug, {
        name: p.category.name,
        slug: p.category.slug,
        productCount: 1,
        // Imagen representativa: la del primer producto encontrado.
        imageUrl: p.mainImageUrl,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.productCount - a.productCount);
}

/**
 * Listado de marcas para `/marcas`. Real â†’ fallback demo.
 */
export type PublicBrandSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  productCount: number;
  isFeatured: boolean;
  description?: string | null;
};

export async function getBrandList(): Promise<{ brands: PublicBrandSummary[]; isDemo: boolean }> {
  try {
    const real = await db.brand.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      orderBy: [{ isFeatured: "desc" }, { position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        isFeatured: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    });
    if (real.length > 0) {
      return {
        brands: real.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          logoUrl: b.logoUrl,
          productCount: b._count.products,
          isFeatured: b.isFeatured,
        })),
        isDemo: false,
      };
    }
  } catch (err) {
    console.warn("[demo] getBrandList â†’ fallback demo:", (err as Error).message);
  }
  return {
    brands: getDemoBrands().map((b) => ({
      id: `demo-brand-${b.slug}`,
      name: b.name,
      slug: b.slug,
      logoUrl: null,
      productCount: b.productCount,
      isFeatured: true,
    })),
    isDemo: true,
  };
}

/**
 * Detalle de marca por slug. Real â†’ demo si la marca está en el catálogo demo.
 */
export type PublicBrandDetail = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  isDemo: boolean;
};

export async function getBrandBySlug(slug: string): Promise<PublicBrandDetail | null> {
  try {
    const brand = await db.brand.findUnique({ where: { slug } });
    if (brand) {
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl,
        description: brand.description,
        isDemo: false,
      };
    }
  } catch (err) {
    console.warn(`[demo] getBrandBySlug(${slug}) â†’ fallback demo:`, (err as Error).message);
  }
  const demo = getDemoBrands().find((b) => b.slug === slug);
  if (!demo) return null;
  return {
    id: `demo-brand-${demo.slug}`,
    name: demo.name,
    slug: demo.slug,
    logoUrl: null,
    description: null,
    isDemo: true,
  };
}

/**
 * Listado de categorías destacadas para la home. Real â†’ fallback demo.
 */
export type PublicCategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
};

export async function getFeaturedCategories(): Promise<PublicCategorySummary[]> {
  try {
    const real = await db.category.findMany({
      where: { isFeatured: true, parentId: null },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      take: 4,
      select: { id: true, name: true, slug: true, description: true, imageUrl: true },
    });
    if (real.length > 0) return real;
  } catch (err) {
    console.warn("[demo] getFeaturedCategories â†’ fallback demo:", (err as Error).message);
  }
  // Fallback demo: usamos los slugs comerciales (running/padel/montana/calzado)
  // porque son más descriptivos para el visitante que las categorías PRICAT
  // ("Bota Alta", "Pantalon Poliester"...).
  return [
    {
      id: "demo-cat-running",
      name: "Running",
      slug: "running",
      description: "Zapatillas, camisetas y mallas técnicas",
      imageUrl: null,
    },
    {
      id: "demo-cat-montana",
      name: "Montaña",
      slug: "montana",
      description: "Anoraks, polares y botas para el outdoor",
      imageUrl: null,
    },
    {
      id: "demo-cat-padel",
      name: "Pádel",
      slug: "padel",
      description: "Calzado y equipación para tu deporte",
      imageUrl: null,
    },
    {
      id: "demo-cat-calzado",
      name: "Calzado",
      slug: "calzado",
      description: "Zapatillas y botas para todos los días",
      imageUrl: null,
    },
  ];
}

/**
 * Listado de marcas destacadas para la home. Real â†’ fallback demo.
 */
/**
 * Marcas que la tienda trabaja de verdad (petición cliente 2026-05-24). La
 * marquesina ("Marcas que trabajan para ti") las prioriza por NOMBRE en este
 * orden, en lugar de depender del flag isFeatured (que está a false en toda la
 * BD). El resto del catálogo no se toca. Match flexible: tolera mayúsculas,
 * acentos y variantes como "+8000" / "MAS 8000".
 */
const MARQUEE_BRAND_NAMES = [
  "John Smith",
  "+8000",
  "Joma",
  "Puma",
  "Babolat",
  "Joluvi",
  "Ditchil",
  "Jhayber",
] as const;

function normalizeBrandName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function getFeaturedBrands(take = 8): Promise<
  Array<{ id: string; name: string; slug: string; logoUrl: string | null }>
> {
  try {
    const all = await db.brand.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    // Empareja cada marca preferida con su registro real en BD (por nombre
    // normalizado). Conserva el orden de MARQUEE_BRAND_NAMES y evita duplicados.
    const curated: Array<{ id: string; name: string; slug: string; logoUrl: string | null }> = [];
    for (const pref of MARQUEE_BRAND_NAMES) {
      const p = normalizeBrandName(pref);
      const match = all.find((b) => {
        const n = normalizeBrandName(b.name);
        return n === p || (n.length >= 3 && p.length >= 3 && (n.includes(p) || p.includes(n)));
      });
      if (match && !curated.some((c) => c.id === match.id)) curated.push(match);
    }
    if (curated.length > 0) return curated.slice(0, take);
  } catch (err) {
    console.warn("[demo] getFeaturedBrands â†’ fallback demo:", (err as Error).message);
  }
  return getDemoBrands()
    .slice(0, take)
    .map((b) => ({
      id: `demo-brand-${b.slug}`,
      name: b.name,
      slug: b.slug,
      logoUrl: null,
    }));
}

/**
 * Categoría por slug (para landing pages /[categoria]). Real â†’ demo si existe.
 */
export type PublicCategoryDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parent: { name: string; slug: string } | null;
  isDemo: boolean;
};

export async function getCategoryBySlug(slug: string): Promise<PublicCategoryDetail | null> {
  try {
    const real = await db.category.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parent: { select: { name: true, slug: true } },
      },
    });
    if (real) return { ...real, isDemo: false };
  } catch (err) {
    console.warn(`[demo] getCategoryBySlug(${slug}) â†’ fallback demo:`, (err as Error).message);
  }
  const demo = getDemoCategories().find((c) => c.slug === slug);
  if (demo) {
    return {
      id: `demo-cat-${demo.slug}`,
      name: demo.name,
      slug: demo.slug,
      description: null,
      imageUrl: null,
      parent: null,
      isDemo: true,
    };
  }
  // Alias comercial (running, padel, montana, calzado).
  const alias = DEMO_CATEGORY_ALIASES[slug];
  if (alias) {
    return {
      id: `demo-cat-${slug}`,
      name: alias.name,
      slug,
      description: null,
      imageUrl: null,
      parent: null,
      isDemo: true,
    };
  }
  return null;
}


const RESERVED_SLUGS = new Set([
  "producto",
  "productos",
  "marca",
  "marcas",
  "blog",
  "buscar",
  "contacto",
  "sobre-nosotros",
  "tienda-en",
  "aviso-legal",
  "politica-privacidad",
  "politica-cookies",
  "condiciones-de-venta",
  "api",
  "admin",
  "login",
  // Landings de género â€” tienen su propio route static en /mujer /hombre /ninos
  "mujer",
  "hombre",
  "ninos",
  // Niño y Niña: hubs propios en /nino y /nina (Bloque 4). Reservados para que
  // la ruta [categoria] no los capture como categoría del catálogo.
  "nino",
  "nina",
  // Bebé: landing propia en /bebe (Bloque bebe). Reservado para que la ruta
  // [categoria] no lo capture como categoría del catálogo.
  "bebe",
  "carrito",
  // Rutas estáticas nuevas: tienen su propio route y el segmento estático gana,
  // pero las reservamos por coherencia para que [categoria] nunca las capture.
  "outlet",
  "catalogo",
  "checkout",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export type CategoryFilterParams = {
  marca?: string[];
  genero?: string[];
  color?: string[];
  talla?: string[];
  tipo?: string[]; // Bloque 3: tipo de calzado (footwearType)
  prenda?: string[]; // Bloque 6: tipo de prenda (garmentType)
  variante?: string[]; // Bloque 6 §18: variante fina (garmentVariant)
  min?: number;
  max?: number;
  oferta?: boolean;
  nuevo?: boolean;
  page?: number;
  perPage?: number;
};

export function parseCategoryParams(searchParams: Record<string, string | string[] | undefined>): CategoryFilterParams {
  const arr = (v: string | string[] | undefined) =>
    typeof v === "string" ? v.split(",").filter(Boolean) : Array.isArray(v) ? v : [];
  const num = (v: string | string[] | undefined) => {
    if (typeof v !== "string") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  // perPage: respeta `?perPage=` de la query (con tope de seguridad) y, si no
  // viene, devuelve undefined para que cada página aplique su propio default
  // (catálogo 24, categoría 12) vía `filters.perPage ?? N`.
  const perPageRaw = num(searchParams.perPage);
  const perPage =
    perPageRaw == null ? undefined : Math.min(48, Math.max(1, Math.floor(perPageRaw)));
  // Bloque 6 §18: inferencia inversa. Si hay ?variante= pero ninguna ?prenda=
  // explícita, inferimos las prendas desde VARIANT_TO_TYPE (sin duplicados) para
  // que el filtro de variante funcione solo (?variante=manga_corta → prenda=camiseta).
  const variante = arr(searchParams.variante);
  const prendaRaw = arr(searchParams.prenda);
  const prenda =
    prendaRaw.length > 0
      ? prendaRaw
      : variante.length > 0
        ? Array.from(
            new Set(
              variante.filter((v) => v in VARIANT_TO_TYPE).map((v) => VARIANT_TO_TYPE[v as GarmentVariant]),
            ),
          )
        : [];
  return {
    marca: arr(searchParams.marca),
    genero: arr(searchParams.genero),
    color: arr(searchParams.color),
    talla: arr(searchParams.talla),
    tipo: arr(searchParams.tipo),
    prenda,
    variante,
    min: num(searchParams.min),
    max: num(searchParams.max),
    oferta: searchParams.oferta === "1",
    nuevo: searchParams.nuevo === "1",
    page: Math.max(1, num(searchParams.page) ?? 1),
    perPage,
  };
}

/**
 * Devuelve el id de una categoría + todos sus descendientes (hijas y nietas).
 * Los productos se enlazan al pivote m2m de la categoría HOJA, no del padre:
 * p.ej. "accesorios" tiene 5 hijas y 217 productos cuelgan de ellas, no del
 * padre (Bug B). El árbol actual tiene 2 niveles; cubrimos hasta nietas.
 */
export async function resolveCategoryIdsWithDescendants(rootId: string): Promise<string[]> {
  const children = await db.category.findMany({
    where: { parentId: rootId },
    select: { id: true },
  });
  const ids = [rootId, ...children.map((c) => c.id)];
  if (children.length > 0) {
    const grandchildren = await db.category.findMany({
      where: { parentId: { in: children.map((c) => c.id) } },
      select: { id: true },
    });
    ids.push(...grandchildren.map((c) => c.id));
  }
  return ids;
}

export function buildProductWhere(opts: {
  categoryId?: string | string[];
  brandId?: string;
  filters: CategoryFilterParams;
  // Outlet (aditivo): si `isOutlet` se pasa, exige Product.isOutlet === valor.
  // `categorySlugContains` restringe a productos enlazados (pivote m2m) a una
  // categoría cuyo slug contiene el patrón (p.ej. "-textil" / "-calzado").
  // Ambos son opcionales: si no se pasan, el `where` mantiene su forma previa
  // (los tests estructurales de buildProductWhere no los usan).
  isOutlet?: boolean;
  categorySlugContains?: string;
}): Prisma.ProductWhereInput {
  const { categoryId, brandId, filters, isOutlet, categorySlugContains } = opts;
  // Regla del cliente: sin stock = fuera de la tienda. Filtramos por el agregado
  // Product.stock (que recomputeProductStock mantiene = suma de tallas). Es un
  // filtro de VISUALIZACIÓN: no toca el estado en BD, así que nunca manda a
  // borrador un producto con stock, y reaparece solo al reponer.
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (isOutlet !== undefined) where.isOutlet = isOutlet;
  // Bloque 3 §12: filtrado por categoría vía pivote m2m del Bloque 2 (apariciones
  // públicas, incluye dup UNISEX/BEBE). El categoryId antiguo NO se reasignó al
  // árbol nuevo (smoke en dev: 0 productos). Se mantiene mientras conviven ambos
  // modelos (expand); el resto del código migra en Bloque 5 PR2 antes de la contractiva.
  if (categoryId) {
    // Bug B: incluir descendientes — los productos cuelgan de las hojas, no del padre.
    const ids = Array.isArray(categoryId) ? categoryId : [categoryId];
    where.categories = { some: { categoryId: { in: ids } } };
  } else if (categorySlugContains) {
    // Outlet: familia (textil/calzado) determinada por el slug de la categoría
    // enlazada vía pivote m2m. textil → slugs "*-textil*"; calzado → "*-calzado*".
    where.categories = {
      some: { category: { slug: { contains: categorySlugContains } } },
    };
  }
  if (brandId) where.brandId = brandId;

  if (filters.marca && filters.marca.length) {
    where.brand = { is: { slug: { in: filters.marca } } };
  }
  if (filters.genero && filters.genero.length) {
    // Cast: genero values must match Prisma enum
    where.gender = { in: filters.genero as never };
  }
  // FIX: el catálogo real tiene colores compuestos ("VERDE KAKI", "GRIS
  // MELANGE", "AZUL MARINO"). El filtro `in` con match exacto fallaba al
  // seleccionar "Verde" porque ningún producto tiene literalmente
  // `colorName="Verde"`. Pasamos a `contains insensitive` con OR para
  // que "Verde" matchee "Verde Kaki", "Verde Manzana", etc.
  const andClauses: Prisma.ProductWhereInput[] = Array.isArray(where.AND)
    ? [...where.AND]
    : where.AND
      ? [where.AND]
      : [];
  if (filters.color && filters.color.length) {
    andClauses.push({
      OR: filters.color.map((c) => ({
        colorName: { contains: c, mode: "insensitive" as const },
      })),
    });
  }
  // Talla: misma corrección. Las tallas en DB pueden venir con espacios
  // o variaciones de caja ("L" vs "l", "UNICA" vs "Unica"). Usamos
  // equals insensitive vía OR para tolerarlo.
  if (filters.talla && filters.talla.length) {
    // Bloque 3: stock-aware. Solo devuelve productos con stock > 0 en alguna de
    // las tallas pedidas (consistente con la ficha del Bloque 1: tallas con stock).
    andClauses.push({
      OR: filters.talla.map((t) => ({
        sizes: {
          some: {
            size: { equals: t, mode: "insensitive" as const },
            stock: { gt: 0 },
          },
        },
      })),
    });
  }
  // Bloque 3 + multi-categoría: un producto sale bajo un tipo de calzado si su
  // footwearType coincide O si está asignado (m2m) a la categoría de ese tipo
  // (`*-calzado-X`). Así un producto puesto en 2 categorías de calzado aparece en
  // los 2 filtros. Va en el MISMO andClauses (intersección AND con el resto).
  if (filters.tipo && filters.tipo.length > 0) {
    andClauses.push({
      OR: [
        { footwearType: { in: filters.tipo } },
        ...filters.tipo.map((t) => ({
          categories: {
            some: { category: { slug: { endsWith: `-calzado-${t.replace(/_/g, "-")}` } } },
          },
        })),
      ],
    });
  }
  // Bloque 6 + multi-categoría: igual que el tipo de calzado pero textil
  // (`*-textil-X`). Un producto en 2 categorías de prenda sale en los 2 filtros.
  if (filters.prenda && filters.prenda.length > 0) {
    andClauses.push({
      OR: [
        { garmentType: { in: filters.prenda } },
        ...filters.prenda.map((p) => ({
          categories: {
            some: { category: { slug: { endsWith: `-textil-${p.replace(/_/g, "-")}` } } },
          },
        })),
      ],
    });
  }
  // Bloque 6 §18: filtro multi de variante fina (mismo andClauses).
  if (filters.variante && filters.variante.length > 0) {
    andClauses.push({ garmentVariant: { in: filters.variante } });
  }
  // "Con stock" robusto (alguna talla con stock, o simple con escalar>0): va en
  // el AND (no como OR raíz, para no mezclarse con los filtros) y se aplica
  // siempre. Se añade AL FINAL para no alterar el orden de las cláusulas de filtro.
  andClauses.push(IN_STOCK_WHERE);
  where.AND = andClauses;
  if (filters.min != null || filters.max != null) {
    where.retailPrice = {
      ...(filters.min != null ? { gte: filters.min } : {}),
      ...(filters.max != null ? { lte: filters.max } : {}),
    };
  }
  if (filters.oferta) {
    // "En oferta" debe coincidir con lo que la card marca como oferta: una card
    // solo pinta oferta si salePrice < retailPrice (ver lib/price.ts → effectivePrice).
    // Un salePrice no nulo pero >= retailPrice NO es oferta. Prisma no compara dos
    // columnas en un where simple, pero sí admite la comparación por referencia de
    // campo ({ _ref, _container }) desde Prisma 5; la usamos para exigir
    // salePrice != null Y salePrice < retailPrice sin raw SQL ni post-filtro
    // (mantiene buildProductWhere puro/síncrono y un único `where` para count,
    // findMany y facetas).
    where.salePrice = {
      not: null,
      lt: db.product.fields.retailPrice,
    };
  }
  if (filters.nuevo) {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    where.createdAt = { gte: date };
  }
  return where;
}

export async function getCategoryFacets(categoryId: string | string[]) {
  // Calculamos counts independientes para cada faceta sobre los productos activos
  // de la categoría (sin filtros aplicados â€” los counts ayudan al usuario a elegir).
  // Bloque 3 §12: filtrado por pivote m2m (igual que buildProductWhere). Facetas
  // INDEPENDIENTES (no respetan otros filtros) — filter-aware es TODO post-B3 (§13).
  // Bug B: acepta array (padre + descendientes) para categorías con hijas.
  const catIds = Array.isArray(categoryId) ? categoryId : [categoryId];
  const baseWhere = { status: "ACTIVE" as const, ...IN_STOCK_WHERE, categories: { some: { categoryId: { in: catIds } } } };
  return computeFacets(baseWhere);
}

/**
 * Facetas del Outlet para una familia (textil/calzado): mismas facetas que una
 * categoría, pero el universo base es `isOutlet:true` + categoría cuyo slug
 * contiene `-${familia}` (vía pivote m2m). Reutiliza `computeFacets` para no
 * duplicar la lógica de groupBy/aggregate.
 */
export async function getOutletFacets(familia: "textil" | "calzado") {
  const baseWhere = {
    status: "ACTIVE" as const,
    ...IN_STOCK_WHERE,
    isOutlet: true,
    categories: { some: { category: { slug: { contains: `-${familia}` } } } },
  } satisfies Prisma.ProductWhereInput;
  return computeFacets(baseWhere);
}

/**
 * Núcleo de cálculo de facetas independientes a partir de un `where` base
 * arbitrario (categoría, outlet, …). Extraído de getCategoryFacets para que el
 * outlet reutilice exactamente la misma forma de facetas (marca/género/color/
 * talla/precio/tipo de calzado/tipo de prenda/variante).
 */
async function computeFacets(baseWhere: Prisma.ProductWhereInput) {
  const [brands, genders, colors, sizes, priceRange, footwearGroups, garmentGroups, garmentVariantGroups] = await Promise.all([
    db.product.groupBy({
      by: ["brandId"],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { _count: { brandId: "desc" } },
      take: 50,
    }),
    db.product.groupBy({
      by: ["gender"],
      where: baseWhere,
      _count: { _all: true },
    }),
    db.product.groupBy({
      by: ["colorName"],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { _count: { colorName: "desc" } },
      take: 24,
    }),
    db.productSize.groupBy({
      by: ["size"],
      where: { product: baseWhere },
      _count: { _all: true },
      orderBy: { _count: { size: "desc" } },
      take: 24,
    }),
    db.product.aggregate({
      where: baseWhere,
      _min: { retailPrice: true },
      _max: { retailPrice: true },
    }),
    db.product.groupBy({
      by: ["footwearType"],
      where: { ...baseWhere, footwearType: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { footwearType: "desc" } },
    }),
    db.product.groupBy({
      by: ["garmentType"],
      where: { ...baseWhere, garmentType: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { garmentType: "desc" } },
    }),
    db.product.groupBy({
      by: ["garmentVariant"],
      where: {
        ...baseWhere,
        garmentVariant: { not: null },
        garmentType: { in: ["camiseta", "pantalon", "mallas"] },
      },
      _count: { _all: true },
      orderBy: { _count: { garmentVariant: "desc" } },
    }),
  ]);

  const brandIds = brands.map((b) => b.brandId);
  const brandsMeta = brandIds.length
    ? await db.brand.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const brandMap = new Map(brandsMeta.map((b) => [b.id, b]));

  return {
    brands: brands
      .map((b) => {
        const meta = brandMap.get(b.brandId);
        return meta
          ? { value: meta.slug, label: meta.name, count: b._count._all }
          : null;
      })
      .filter(Boolean) as { value: string; label: string; count: number }[],
    genders: genders.map((g) => ({
      value: g.gender,
      label: g.gender,
      count: g._count._all,
    })),
    colors: colors
      .filter((c) => c.colorName && c.colorName !== "Ãšnico")
      .map((c) => ({ value: c.colorName, label: c.colorName, count: c._count._all })),
    sizes: sizes.map((s) => ({ value: s.size, label: s.size, count: s._count._all })),
    // Bloque 3: value = clave footwearType; el label legible lo aplica ProductFilters
    // con FOOTWEAR_TYPE_LABELS (igual que genders, que devuelve la clave cruda).
    footwearTypes: footwearGroups
      .filter((f) => f.footwearType)
      .map((f) => ({ value: f.footwearType as string, label: f.footwearType as string, count: f._count._all })),
    // Bloque 6: value = clave garmentType; el label legible lo aplica ProductFilters
    // con GARMENT_TYPE_LABELS (igual que footwearTypes/genders, clave cruda).
    garmentTypes: garmentGroups
      .filter((g) => g.garmentType)
      .map((g) => ({ value: g.garmentType as string, label: g.garmentType as string, count: g._count._all })),
    // Bloque 6 §18: facetas de variante (label legible vía GARMENT_VARIANT_LABELS en ProductFilters).
    garmentVariants: garmentVariantGroups
      .filter((v) => v.garmentVariant)
      .map((v) => ({ value: v.garmentVariant as string, label: v.garmentVariant as string, count: v._count._all })),
    priceMin: priceRange._min.retailPrice ? Number(priceRange._min.retailPrice) : 0,
    priceMax: priceRange._max.retailPrice ? Number(priceRange._max.retailPrice) : 500,
  };
}
