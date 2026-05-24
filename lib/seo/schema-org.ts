/**
 * Builders de JSON-LD para schemas Schema.org.
 * Devuelven objetos serializables que se inyectan en <script type="application/ld+json">.
 *
 * Convenciones:
 *   - Todos los identificadores `@id` usan la URL absoluta del sitio para
 *     poder enlazarlos entre sí (knowledge graph implícito).
 *   - Los campos `undefined` se omiten al serializar (lo hace JSON.stringify).
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Zona Sport";
const STORE_ID = `${SITE_URL}/#store`;
const ORG_ID = `${SITE_URL}/#organization`;

export const STORE_NAP = {
  name: SITE_NAME,
  legalName: "Zona Sport",
  streetAddress: "C. Silos, 3",
  addressLocality: "Puebla de la Calzada",
  addressRegion: "BA",
  postalCode: "06490",
  addressCountry: "ES",
  telephone: "+34689110691",
  email: "hola@zonasport.es",
  latitude: 38.881,
  longitude: -6.622,
};

export const STORE_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "10:00",
    closes: "14:00",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "17:30",
    closes: "20:30",
  },
  {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: "Saturday",
    opens: "10:00",
    closes: "14:00",
  },
];

/**
 * Ciudades locales — se mantienen para reforzar el SEO local de cercanía
 * (Puebla de la Calzada y comarca de las Vegas Bajas / Mérida / Badajoz).
 */
export const AREA_SERVED_CITIES = [
  "Puebla de la Calzada",
  "Montijo",
  "Lobón",
  "Talavera la Real",
  "Mérida",
  "Badajoz",
  "Esparragalejo",
  "La Garrovilla",
  "Torremayor",
  "Calamonte",
].map((name) => ({ "@type": "City", name }));

/**
 * Área de servicio del negocio: ahora se envía a toda España. Exponemos el
 * país como ámbito principal y mantenemos además las ciudades locales para no
 * perder señal de SEO de proximidad.
 */
export const AREA_SERVED = [
  { "@type": "Country", name: "España" },
  ...AREA_SERVED_CITIES,
];

const DEFAULT_SAME_AS: string[] = [
  // Rellenar con perfiles reales (Instagram, Facebook, Google Business, etc.)
  // Mantener actualizados; afecta a entity disambiguation en Google.
];

// ---------------------------------------------------------------------------
// LocalBusiness / Organization
// ---------------------------------------------------------------------------

export function localBusinessSchema(opts: { sameAs?: string[] } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SportingGoodsStore"],
    "@id": STORE_ID,
    name: STORE_NAP.name,
    image: `${SITE_URL}/og-default.png`,
    logo: `${SITE_URL}/logo.webp`,
    url: SITE_URL,
    telephone: STORE_NAP.telephone,
    email: STORE_NAP.email,
    priceRange: "€€",
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Credit Card, Bizum",
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE_NAP.streetAddress,
      addressLocality: STORE_NAP.addressLocality,
      addressRegion: STORE_NAP.addressRegion,
      postalCode: STORE_NAP.postalCode,
      addressCountry: STORE_NAP.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: STORE_NAP.latitude,
      longitude: STORE_NAP.longitude,
    },
    hasMap: `https://www.google.com/maps?q=${STORE_NAP.latitude},${STORE_NAP.longitude}`,
    openingHoursSpecification: STORE_HOURS,
    areaServed: AREA_SERVED,
    sameAs: opts.sameAs ?? DEFAULT_SAME_AS,
  };
}

export function organizationSchema(opts: { sameAs?: string[] } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: STORE_NAP.legalName,
    alternateName: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.webp`,
      width: 512,
      height: 512,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: STORE_NAP.telephone,
        email: STORE_NAP.email,
        contactType: "customer service",
        areaServed: "ES",
        availableLanguage: ["Spanish"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE_NAP.streetAddress,
      addressLocality: STORE_NAP.addressLocality,
      addressRegion: STORE_NAP.addressRegion,
      postalCode: STORE_NAP.postalCode,
      addressCountry: STORE_NAP.addressCountry,
    },
    sameAs: opts.sameAs ?? DEFAULT_SAME_AS,
  };
}

// ---------------------------------------------------------------------------
// WebSite / Search
// ---------------------------------------------------------------------------

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "es-ES",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/buscar?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------

export function aboutPageSchema(opts: { title: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE_URL}/sobre-nosotros#about`,
    url: `${SITE_URL}/sobre-nosotros`,
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": ORG_ID },
  };
}

export function contactPageSchema(opts: { title: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${SITE_URL}/contacto#contact`,
    url: `${SITE_URL}/contacto`,
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: { "@id": STORE_ID },
  };
}

export function siteNavigationElementSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: items.map((it) => it.name),
    url: items.map((it) => `${SITE_URL}${it.path}`),
  };
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// Producto
// ---------------------------------------------------------------------------

export function productSchema(p: {
  name: string;
  description?: string | null;
  images: string[];
  sku: string;
  gtin13?: string | null;
  mpn?: string | null;
  brandName: string;
  categoryName?: string | null;
  price: number;
  inStock: boolean;
  slug: string;
  condition?: "NewCondition" | "UsedCondition";
  aggregateRating?: { ratingValue: number; reviewCount: number };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images,
    description: p.description ?? undefined,
    sku: p.sku,
    ...(p.gtin13 ? { gtin13: p.gtin13 } : {}),
    ...(p.mpn ? { mpn: p.mpn } : {}),
    brand: { "@type": "Brand", name: p.brandName },
    ...(p.categoryName ? { category: p.categoryName } : {}),
    ...(p.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.aggregateRating.ratingValue,
            reviewCount: p.aggregateRating.reviewCount,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/producto/${p.slug}`,
      priceCurrency: "EUR",
      price: p.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
        .toISOString()
        .slice(0, 10),
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: `https://schema.org/${p.condition ?? "NewCondition"}`,
      seller: { "@id": STORE_ID },
    },
  };
}

export function productListSchema(items: Array<{ name: string; slug: string; image?: string | null }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/producto/${it.slug}`,
      name: it.name,
      ...(it.image ? { image: it.image } : {}),
    })),
  };
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export function blogPostingSchema(p: {
  title: string;
  description?: string | null;
  slug: string;
  publishedAt: Date | string;
  modifiedAt?: Date | string | null;
  author: string;
  imageUrl?: string | null;
  tags?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description ?? undefined,
    image: p.imageUrl ? [p.imageUrl] : undefined,
    datePublished: new Date(p.publishedAt).toISOString(),
    dateModified: p.modifiedAt ? new Date(p.modifiedAt).toISOString() : undefined,
    author: { "@type": "Organization", name: p.author },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${p.slug}` },
    keywords: p.tags?.join(", "),
  };
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export function faqPageSchema(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

// ---------------------------------------------------------------------------
// Brand / Categoría / Landing local
// ---------------------------------------------------------------------------

export function brandSchema(b: {
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: b.name,
    url: `${SITE_URL}/marca/${b.slug}`,
    description: b.description ?? undefined,
    logo: b.logoUrl ?? undefined,
  };
}

export function categoryCollectionSchema(opts: {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/${opts.slug}#collection`,
    url: `${SITE_URL}/${opts.slug}`,
    name: opts.name,
    description: opts.description ?? undefined,
    image: opts.imageUrl ?? undefined,
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

export function localLandingSchema(municipio: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "SportingGoodsStore"],
    "@id": `${SITE_URL}/tienda-en/${municipio.toLowerCase()}/#localbusiness`,
    name: `${SITE_NAME} — tienda de deportes cerca de ${municipio}`,
    parentOrganization: { "@id": ORG_ID },
    areaServed: { "@type": "City", name: municipio },
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE_NAP.streetAddress,
      addressLocality: STORE_NAP.addressLocality,
      addressRegion: STORE_NAP.addressRegion,
      postalCode: STORE_NAP.postalCode,
      addressCountry: STORE_NAP.addressCountry,
    },
    telephone: STORE_NAP.telephone,
  };
}

/** Serializa el schema como string para inyectar en <script>. Escapa `<` para evitar XSS. */
export function jsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
