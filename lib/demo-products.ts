/**
 * lib/demo-products.ts — GENERADO AUTOMÁTICAMENTE
 *
 * No editar a mano. Regenerar con:
 *   npx tsx scripts/download-demo-products.ts
 *
 * Catálogo de demo (24 productos reales del PRICAT) usado como fallback
 * mientras la base de datos no está aprovisionada o devuelve 0 productos.
 * Las imágenes viven en `public/sample-products/<slug>.webp`.
 */

/**
 * Géneros soportados (espejo del enum Prisma `Gender`). Si Prisma añade nuevos
 * valores hay que reflejarlos aquí.
 */
export type DemoGender =
  | "HOMBRE"
  | "MUJER"
  | "UNISEX"
  | "NINO"
  | "NINA"
  | "BEBE"
  | "NO_ESPECIFICADO";

export interface DemoProduct {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  colorName: string;
  mainImageUrl: string;
  retailPrice: number;
  salePrice: number | null;
  source: "LOCAL";
  modelCode: string;
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
  /**
   * Género del catálogo de demo. Para los productos del PRICAT real lo
   * inferimos por heurística (ver `inferDemoGender` más abajo). Cuando llegue
   * la BD real, este campo se sustituye por `product.gender` de Prisma.
   */
  gender: DemoGender;
  isDemo: true;
}

/**
 * Heurística para inferir género desde un producto del PRICAT cuando no hay
 * metadatos explícitos. Se usa una sola vez al construir `DEMO_PRODUCTS` y
 * está documentada para que sea trivial revisarla en code review.
 *
 * Reglas:
 *  - Categoría "Malla" → MUJER (la única malla del catálogo es ANUKET, modelo
 *    de mujer en el PRICAT de John Smith).
 *  - Sufijo " M" en modelCode o nombre → HOMBRE (convención John Smith /
 *    +8000 para sus líneas masculinas: CASTELO M, COTO M, HOCEN, etc.).
 *  - Camisetas y bermudas con modelos en castellano masculino (ERIC, GESEL,
 *    VILALBA, COIROS, ERRO, ARANGE, HORNOC) → HOMBRE.
 *  - Resto (calzado, anoraks, pantalones de nieve, chubasqueros, polares y
 *    accesorios outdoor) → UNISEX. Es la opción más conservadora cuando el
 *    modelo se vende a ambos géneros sin diferenciar.
 */
function inferDemoGender(input: {
  category: { slug: string };
  modelCode: string;
  name: string;
}): DemoGender {
  const catSlug = input.category.slug.toLowerCase();
  const code = input.modelCode.toUpperCase();
  const name = input.name.toUpperCase();

  // Categorías exclusivamente femeninas en el PRICAT cargado.
  if (catSlug === "malla") return "MUJER";

  // Sufijo " M" → línea hombre.
  if (/\sM(\s|$)/.test(code) || /\sM(\s|$)/.test(name)) return "HOMBRE";

  // Modelos masculinos identificados manualmente del PRICAT.
  const HOMBRE_MODELS = new Set([
    "ERIC",
    "GESEL",
    "VILALBA",
    "COIROS",
    "ERRO 24I",
    "ARANGE",
    "HORNOC",
    "HOCEN 24I",
  ]);
  if (HOMBRE_MODELS.has(code)) return "HOMBRE";

  // Por defecto: calzado, abrigos técnicos y outdoor → UNISEX.
  return "UNISEX";
}

type DemoProductRaw = Omit<DemoProduct, "gender">;

const DEMO_PRODUCTS_RAW: DemoProductRaw[] = [
  {
    "id": "demo-rewik-004000",
    "slug": "zapatilla-john-smith-rewik-azul-marino",
    "name": "Zapatilla John Smith REWIK Azul Marino",
    "shortName": null,
    "colorName": "Azul Marino",
    "mainImageUrl": "/sample-products/zapatilla-john-smith-rewik-azul-marino.webp",
    "retailPrice": 39.99,
    "salePrice": null,
    "modelCode": "REWIK",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Zapatilla",
      "slug": "zapatilla"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-ruder-005012",
    "slug": "zapatilla-john-smith-ruder-negroblanco",
    "name": "Zapatilla John Smith RUDER Negro/Blanco",
    "shortName": null,
    "colorName": "Negro/Blanco",
    "mainImageUrl": "/sample-products/zapatilla-john-smith-ruder-negroblanco.webp",
    "retailPrice": 39.99,
    "salePrice": null,
    "modelCode": "RUDER",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Zapatilla",
      "slug": "zapatilla"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-ruder e-004000",
    "slug": "zapatilla-john-smith-ruder-e-azul-marino",
    "name": "Zapatilla John Smith RUDER E Azul Marino",
    "shortName": null,
    "colorName": "Azul Marino",
    "mainImageUrl": "/sample-products/zapatilla-john-smith-ruder-e-azul-marino.webp",
    "retailPrice": 39.99,
    "salePrice": null,
    "modelCode": "RUDER E",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Zapatilla",
      "slug": "zapatilla"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-vakir 24i-012000",
    "slug": "bota-alta-john-smith-vakir-24i-blanco",
    "name": "Bota Alta John Smith VAKIR 24I Blanco",
    "shortName": null,
    "colorName": "Blanco",
    "mainImageUrl": "/sample-products/bota-alta-john-smith-vakir-24i-blanco.webp",
    "retailPrice": 39.99,
    "salePrice": null,
    "modelCode": "VAKIR 24I",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Bota Alta",
      "slug": "bota-alta"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-libel high 24i-012000",
    "slug": "bota-alta-john-smith-libel-high-24i-blanco",
    "name": "Bota Alta John Smith LIBEL HIGH 24I Blanco",
    "shortName": null,
    "colorName": "Blanco",
    "mainImageUrl": "/sample-products/bota-alta-john-smith-libel-high-24i-blanco.webp",
    "retailPrice": 42.99,
    "salePrice": null,
    "modelCode": "LIBEL HIGH 24I",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Bota Alta",
      "slug": "bota-alta"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-tovir-005000",
    "slug": "bota-alta-8000-tovir-negro",
    "name": "Bota Alta +8000 TOVIR Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/bota-alta-8000-tovir-negro.webp",
    "retailPrice": 91.99,
    "salePrice": null,
    "modelCode": "TOVIR",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Bota Alta",
      "slug": "bota-alta"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-terux 24i-005037",
    "slug": "zapatilla-8000-terux-24i-negronaranja",
    "name": "Zapatilla +8000 TERUX 24I Negro/Naranja",
    "shortName": null,
    "colorName": "Negro/Naranja",
    "mainImageUrl": "/sample-products/zapatilla-8000-terux-24i-negronaranja.webp",
    "retailPrice": 100.99,
    "salePrice": null,
    "modelCode": "TERUX 24I",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Zapatilla",
      "slug": "zapatilla"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-takon 24i-005000",
    "slug": "bota-alta-8000-takon-24i-negro",
    "name": "Bota Alta +8000 TAKON 24I Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/bota-alta-8000-takon-24i-negro.webp",
    "retailPrice": 84.99,
    "salePrice": null,
    "modelCode": "TAKON 24I",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Bota Alta",
      "slug": "bota-alta"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-eric-151000",
    "slug": "camiseta-mlarga-john-smith-eric-gris-medio-vigore",
    "name": "Camiseta M/Larga John Smith ERIC Gris Medio Vigore",
    "shortName": null,
    "colorName": "Gris Medio Vigore",
    "mainImageUrl": "/sample-products/camiseta-mlarga-john-smith-eric-gris-medio-vigore.webp",
    "retailPrice": 19.99,
    "salePrice": null,
    "modelCode": "ERIC",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Camiseta M/Larga",
      "slug": "camiseta-mlarga"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-castelo m 24i-005000",
    "slug": "pantalon-poliester-john-smith-castelo-m-24i-negro",
    "name": "Pantalon Poliester John Smith CASTELO M 24I Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/pantalon-poliester-john-smith-castelo-m-24i-negro.webp",
    "retailPrice": 19.99,
    "salePrice": null,
    "modelCode": "CASTELO M 24I",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Pantalon Poliester",
      "slug": "pantalon-poliester"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-gesel-151000",
    "slug": "camiseta-mcorta-john-smith-gesel-gris-medio-vigore",
    "name": "Camiseta M/Corta John Smith GESEL Gris Medio Vigore",
    "shortName": null,
    "colorName": "Gris Medio Vigore",
    "mainImageUrl": "/sample-products/camiseta-mcorta-john-smith-gesel-gris-medio-vigore.webp",
    "retailPrice": 18.99,
    "salePrice": null,
    "modelCode": "GESEL",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Camiseta M/Corta",
      "slug": "camiseta-mcorta"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-hocen 24i-005000",
    "slug": "short-poliester-john-smith-hocen-24i-negro",
    "name": "Short Poliester John Smith HOCEN 24I Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/short-poliester-john-smith-hocen-24i-negro.webp",
    "retailPrice": 32.99,
    "salePrice": null,
    "modelCode": "HOCEN 24I",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Short Poliester",
      "slug": "short-poliester"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-coto m-005000",
    "slug": "traje-entrenamiento-poliester-john-smith-coto-m-negro",
    "name": "Traje Entrenamiento Poliester John Smith COTO M Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/traje-entrenamiento-poliester-john-smith-coto-m-negro.webp",
    "retailPrice": 54.99,
    "salePrice": null,
    "modelCode": "COTO M",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Traje Entrenamiento Poliester",
      "slug": "traje-entrenamiento-poliester"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-coiros-015000",
    "slug": "traje-jogging-john-smith-coiros-kaki",
    "name": "Traje Jogging John Smith COIROS Kaki",
    "shortName": null,
    "colorName": "Kaki",
    "mainImageUrl": "/sample-products/traje-jogging-john-smith-coiros-kaki.webp",
    "retailPrice": 54.99,
    "salePrice": null,
    "modelCode": "COIROS",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Traje Jogging",
      "slug": "traje-jogging"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-anuket 24i-005000",
    "slug": "malla-john-smith-anuket-24i-negro",
    "name": "Malla John Smith ANUKET 24I Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/malla-john-smith-anuket-24i-negro.webp",
    "retailPrice": 38.99,
    "salePrice": null,
    "modelCode": "ANUKET 24I",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Malla",
      "slug": "malla"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-vilalba-005000",
    "slug": "bermuda-moda-john-smith-vilalba-negro",
    "name": "Bermuda Moda John Smith VILALBA Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/bermuda-moda-john-smith-vilalba-negro.webp",
    "retailPrice": 29.99,
    "salePrice": null,
    "modelCode": "VILALBA",
    "brand": {
      "name": "John Smith",
      "slug": "john-smith"
    },
    "category": {
      "name": "Bermuda Moda",
      "slug": "bermuda-moda"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-vezar-005000",
    "slug": "anorack-parka-8000-vezar-negro",
    "name": "Anorack Parka +8000 VEZAR Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/anorack-parka-8000-vezar-negro.webp",
    "retailPrice": 163.99,
    "salePrice": null,
    "modelCode": "VEZAR",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Anorack Parka",
      "slug": "anorack-parka"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-astun 24i-005000",
    "slug": "pantalon-nieve-8000-astun-24i-negro",
    "name": "Pantalon Nieve +8000 ASTUN 24I Negro",
    "shortName": null,
    "colorName": "Negro",
    "mainImageUrl": "/sample-products/pantalon-nieve-8000-astun-24i-negro.webp",
    "retailPrice": 112.99,
    "salePrice": null,
    "modelCode": "ASTUN 24I",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Pantalon Nieve",
      "slug": "pantalon-nieve"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-climate 24i-403000",
    "slug": "chubasquero-8000-climate-24i-avellana",
    "name": "Chubasquero +8000 CLIMATE 24I Avellana",
    "shortName": null,
    "colorName": "Avellana",
    "mainImageUrl": "/sample-products/chubasquero-8000-climate-24i-avellana.webp",
    "retailPrice": 180.99,
    "salePrice": null,
    "modelCode": "CLIMATE 24I",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Chubasquero",
      "slug": "chubasquero"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-dinamic 24i-403000",
    "slug": "anorack-treking-8000-dinamic-24i-avellana",
    "name": "Anorack Treking +8000 DINAMIC 24I Avellana",
    "shortName": null,
    "colorName": "Avellana",
    "mainImageUrl": "/sample-products/anorack-treking-8000-dinamic-24i-avellana.webp",
    "retailPrice": 123.99,
    "salePrice": null,
    "modelCode": "DINAMIC 24I",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Anorack Treking",
      "slug": "anorack-treking"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-colese 24i-403000",
    "slug": "anorack-cazadora-8000-colese-24i-avellana",
    "name": "Anorack Cazadora +8000 COLESE 24I Avellana",
    "shortName": null,
    "colorName": "Avellana",
    "mainImageUrl": "/sample-products/anorack-cazadora-8000-colese-24i-avellana.webp",
    "retailPrice": 158.99,
    "salePrice": null,
    "modelCode": "COLESE 24I",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Anorack Cazadora",
      "slug": "anorack-cazadora"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-arange-075000",
    "slug": "sudadera-8000-arange-jungla",
    "name": "Sudadera +8000 ARANGE Jungla",
    "shortName": null,
    "colorName": "Jungla",
    "mainImageUrl": "/sample-products/sudadera-8000-arange-jungla.webp",
    "retailPrice": 49.99,
    "salePrice": null,
    "modelCode": "ARANGE",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Sudadera",
      "slug": "sudadera"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-hornoc-043000",
    "slug": "pantalon-aventura-8000-hornoc-ocre",
    "name": "Pantalon Aventura +8000 HORNOC Ocre",
    "shortName": null,
    "colorName": "Ocre",
    "mainImageUrl": "/sample-products/pantalon-aventura-8000-hornoc-ocre.webp",
    "retailPrice": 82.99,
    "salePrice": null,
    "modelCode": "HORNOC",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Pantalon Aventura",
      "slug": "pantalon-aventura"
    },
    "source": "LOCAL",
    "isDemo": true
  },
  {
    "id": "demo-erro 24i-046000",
    "slug": "camiseta-mlarga-8000-erro-24i-mostaza",
    "name": "Camiseta M/Larga +8000 ERRO 24I Mostaza",
    "shortName": null,
    "colorName": "Mostaza",
    "mainImageUrl": "/sample-products/camiseta-mlarga-8000-erro-24i-mostaza.webp",
    "retailPrice": 39.99,
    "salePrice": null,
    "modelCode": "ERRO 24I",
    "brand": {
      "name": "+8000",
      "slug": "8000"
    },
    "category": {
      "name": "Camiseta M/Larga",
      "slug": "camiseta-mlarga"
    },
    "source": "LOCAL",
    "isDemo": true
  }
];

/**
 * Catálogo final con `gender` resuelto por heurística. Se mantiene
 * `DEMO_PRODUCTS_RAW` separado para que el script de regeneración
 * (`scripts/download-demo-products.ts`) pueda sobreescribirlo sin tocar la
 * lógica de asignación de género.
 */
export const DEMO_PRODUCTS: DemoProduct[] = DEMO_PRODUCTS_RAW.map((p) => ({
  ...p,
  gender: inferDemoGender(p),
}));

export const DEMO_FEATURED: DemoProduct[] = DEMO_PRODUCTS.slice(0, 8);

export function getDemoProductsByCategory(slug: string): DemoProduct[] {
  return DEMO_PRODUCTS.filter((p) => p.category.slug === slug);
}

export function getDemoProductsByBrand(slug: string): DemoProduct[] {
  return DEMO_PRODUCTS.filter((p) => p.brand.slug === slug);
}

/**
 * Productos del demo filtrados por género. Si el género solicitado es
 * "UNISEX" (o un genérico análogo), se devuelven todos los productos
 * etiquetados como UNISEX. Para HOMBRE/MUJER también se incluyen los UNISEX
 * (un producto unisex puede mostrarse perfectamente en /hombre y /mujer), tal
 * como hacen Decathlon o Nike. Para NINO/NINA/BEBE solo se devuelven los que
 * coincidan exactamente — no inferimos infantil del adulto.
 */
export function getDemoProductsByGender(g: DemoGender): DemoProduct[] {
  if (g === "HOMBRE" || g === "MUJER") {
    return DEMO_PRODUCTS.filter((p) => p.gender === g || p.gender === "UNISEX");
  }
  return DEMO_PRODUCTS.filter((p) => p.gender === g);
}

/**
 * Lista única de marcas presentes en el catálogo de demo, con el conteo de
 * productos asociados. Útil para llenar la página /marcas mientras no hay BD.
 */
export function getDemoBrands(): Array<{
  name: string;
  slug: string;
  productCount: number;
}> {
  const map = new Map<string, { name: string; slug: string; productCount: number }>();
  for (const p of DEMO_PRODUCTS) {
    const existing = map.get(p.brand.slug);
    if (existing) {
      existing.productCount += 1;
    } else {
      map.set(p.brand.slug, { name: p.brand.name, slug: p.brand.slug, productCount: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.productCount - a.productCount);
}

/**
 * Lista única de categorías presentes en el catálogo de demo, con conteo.
 */
export function getDemoCategories(): Array<{
  name: string;
  slug: string;
  productCount: number;
}> {
  const map = new Map<string, { name: string; slug: string; productCount: number }>();
  for (const p of DEMO_PRODUCTS) {
    const existing = map.get(p.category.slug);
    if (existing) {
      existing.productCount += 1;
    } else {
      map.set(p.category.slug, {
        name: p.category.name,
        slug: p.category.slug,
        productCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.productCount - a.productCount);
}
