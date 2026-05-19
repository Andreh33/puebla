import { db, type Prisma } from "@/lib/db";
import {
  DEMO_PRODUCTS,
  DEMO_FEATURED,
  getDemoBrands,
  getDemoCategories,
  getDemoProductsByBrand,
  getDemoProductsByCategory,
  getDemoProductsByGender,
  type DemoGender,
  type DemoProduct,
} from "@/lib/demo-products";

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

  // NIÃ‘OS
  bebe: { name: "Bebé", categorySlugs: [] },

  // Mantenemos coherencia con los slugs que sí están directamente en el demo.
};

function aliasProducts(slug: string): DemoProduct[] {
  const alias = DEMO_CATEGORY_ALIASES[slug];
  if (!alias) return [];
  return DEMO_PRODUCTS.filter((p) => alias.categorySlugs.includes(p.category.slug));
}

/**
 * Indica si un slug está registrado como alias del mega-menú. Ãštil para
 * distinguir "categoría conocida pero sin productos todavía" de "categoría
 * inexistente". En el primer caso queremos mostrar la página vacía (con hero
 * y CTA) en vez de caer al fallback de "todos los productos demo".
 */
function isAliasSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEMO_CATEGORY_ALIASES, slug);
}

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
 * superconjunto de los campos seleccionados desde Prisma y de `DemoProduct`.
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

function demoToCard(p: DemoProduct): PublicProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortName: p.shortName,
    colorName: p.colorName,
    mainImageUrl: p.mainImageUrl,
    retailPrice: p.retailPrice,
    salePrice: p.salePrice,
    source: p.source,
    brand: p.brand,
    isDemo: true,
  };
}

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
    const real = await db.product.findMany({
      where: { status: "ACTIVE", isFeatured: true },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
      select: productCardSelect,
    });
    if (real.length > 0) {
      return real.map((p) => ({
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
    }
  } catch (err) {
    console.warn("[demo] getFeaturedProducts â†’ fallback demo:", (err as Error).message);
  }
  return DEMO_FEATURED.slice(0, limit).map(demoToCard);
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
    const where: Prisma.ProductWhereInput = opts.where ?? { status: "ACTIVE" };
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
      `[demo] getCategoryProducts(${opts.categorySlug}) â†’ fallback demo:`,
      (err as Error).message,
    );
  }
  // 1) Match directo por slug de categoría
  let subset = getDemoProductsByCategory(opts.categorySlug);
  // 2) Match por alias comercial (running, padel, montana, calzado…)
  if (subset.length === 0) {
    const aliased = aliasProducts(opts.categorySlug);
    if (aliased.length > 0) subset = aliased;
  }
  // 3) Si el slug es un alias conocido del mega-menú pero sin match natural
  // (accesorios todavía sin catálogo, "Bebé"…), devolvemos lista vacía. La
  // página renderiza el hero + estado "Pronto en tienda". Mucho más limpio
  // que enseñar productos aleatorios.
  if (subset.length === 0 && isAliasSlug(opts.categorySlug)) {
    return { products: [], total: 0, isDemo: true };
  }
  // 4) Ãšltimo recurso: todos los demo â€” vale más enseñar producto real con
  // imagen que ninguno.
  const list = subset.length > 0 ? subset : DEMO_PRODUCTS;
  return {
    products: list.slice(skip, skip + take).map(demoToCard),
    total: list.length,
    isDemo: true,
  };
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
      `[demo] getBrandProducts(${opts.brandSlug}) â†’ fallback demo:`,
      (err as Error).message,
    );
  }
  const list = getDemoProductsByBrand(opts.brandSlug);
  // Si la marca no aparece en el demo, devolvemos lista vacía (no inventamos
  // productos de otras marcas) pero con isDemo=true para que la UI pueda dar
  // contexto.
  return {
    products: list.slice(skip, skip + take).map(demoToCard),
    total: list.length,
    isDemo: true,
  };
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
      `[demo] getProductsByGender(${opts.gender}) â†’ fallback demo:`,
      (err as Error).message,
    );
  }
  const list = getDemoProductsByGender(opts.gender);
  return {
    products: list.slice(skip, skip + take).map(demoToCard),
    total: list.length,
    isDemo: true,
  };
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
export async function getFeaturedBrands(take = 6): Promise<
  Array<{ id: string; name: string; slug: string; logoUrl: string | null }>
> {
  try {
    const real = await db.brand.findMany({
      where: { isFeatured: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      take,
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (real.length > 0) return real;
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
  "carrito",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export type CategoryFilterParams = {
  marca?: string[];
  genero?: string[];
  color?: string[];
  talla?: string[];
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
  return {
    marca: arr(searchParams.marca),
    genero: arr(searchParams.genero),
    color: arr(searchParams.color),
    talla: arr(searchParams.talla),
    min: num(searchParams.min),
    max: num(searchParams.max),
    oferta: searchParams.oferta === "1",
    nuevo: searchParams.nuevo === "1",
    page: Math.max(1, num(searchParams.page) ?? 1),
    perPage: 12,
  };
}

export function buildProductWhere(opts: {
  categoryId?: string;
  brandId?: string;
  filters: CategoryFilterParams;
}): Prisma.ProductWhereInput {
  const { categoryId, brandId, filters } = opts;
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;

  if (filters.marca && filters.marca.length) {
    where.brand = { is: { slug: { in: filters.marca } } };
  }
  if (filters.genero && filters.genero.length) {
    // Cast: genero values must match Prisma enum
    where.gender = { in: filters.genero as never };
  }
  if (filters.color && filters.color.length) {
    where.colorName = { in: filters.color, mode: "insensitive" };
  }
  if (filters.talla && filters.talla.length) {
    where.sizes = { some: { size: { in: filters.talla } } };
  }
  if (filters.min != null || filters.max != null) {
    where.retailPrice = {
      ...(filters.min != null ? { gte: filters.min } : {}),
      ...(filters.max != null ? { lte: filters.max } : {}),
    };
  }
  if (filters.oferta) {
    where.salePrice = { not: null };
  }
  if (filters.nuevo) {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    where.createdAt = { gte: date };
  }
  return where;
}

export async function getCategoryFacets(categoryId: string) {
  // Calculamos counts independientes para cada faceta sobre los productos activos
  // de la categoría (sin filtros aplicados â€” los counts ayudan al usuario a elegir).
  const baseWhere = { status: "ACTIVE" as const, categoryId };

  const [brands, genders, colors, sizes, priceRange] = await Promise.all([
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
    priceMin: priceRange._min.retailPrice ? Number(priceRange._min.retailPrice) : 0,
    priceMax: priceRange._max.retailPrice ? Number(priceRange._max.retailPrice) : 500,
  };
}
