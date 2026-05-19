/**
 * Núcleo del seed — extraído de prisma/seed.ts para poder ejecutarlo tanto
 * desde el CLI (`npm run seed`) como desde una API route HTTP protegida
 * (`POST /api/admin/setup`).
 *
 * Es idempotente: cada operación es un `upsert` o un `findUnique + create`
 * con clave externalId = `demo:<slug>`. Llamarlo dos veces no duplica nada.
 *
 * Devuelve métricas de lo que se hizo para que el endpoint pueda reportar
 * al cliente. Las excepciones se propagan — el caller decide qué hacer
 * (CLI imprime y exit 1; route devuelve 500).
 */

import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PRODUCTS } from "../demo-products";

export type SeedResult = {
  admin: { email: string; created: boolean };
  brands: number;
  categories: number;
  settings: number;
  demoProducts: {
    created: number;
    existed: number;
    failed: number;
    failures?: Array<{ slug: string; error: string }>;
  };
  blogPosts: number;
  durationMs: number;
};

export type SeedOptions = {
  ownerEmail?: string;
  ownerPassword?: string;
  ownerName?: string;
  /** Si true, no graba contraseña aleatoria — sólo el email pasado. Para tests. */
  skipPasswordResetOnExisting?: boolean;
};

export async function runSeed(db: PrismaClient, opts: SeedOptions = {}): Promise<SeedResult> {
  const t0 = Date.now();

  // ----------------------------- ADMIN OWNER ------------------------------
  const ownerEmail = (
    opts.ownerEmail ||
    process.env.SEED_OWNER_EMAIL ||
    "admin@zonasport.es"
  ).toLowerCase();
  const ownerPassword =
    opts.ownerPassword || process.env.SEED_OWNER_PASSWORD || "ChangeMe2026!";
  const ownerName =
    opts.ownerName || process.env.SEED_OWNER_NAME || "Administrador Zona Sport";

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const existingOwner = await db.adminUser.findUnique({
    where: { email: ownerEmail },
    select: { id: true },
  });
  const ownerCreated = !existingOwner;

  await db.adminUser.upsert({
    where: { email: ownerEmail },
    update: opts.skipPasswordResetOnExisting
      ? { name: ownerName, role: "OWNER", isActive: true }
      : { name: ownerName, role: "OWNER", isActive: true, passwordHash },
    create: {
      email: ownerEmail,
      passwordHash,
      name: ownerName,
      role: "OWNER",
      isActive: true,
    },
  });

  // ----------------------------- MARCAS -----------------------------------
  const brands = [
    {
      name: "John Smith",
      slug: "john-smith",
      description:
        "Marca de moda joven, casual, urban, jogging y entrenamiento. Una de las marcas más representativas en el catálogo de Zona Sport.",
      isFeatured: true,
      position: 1,
    },
    {
      name: "+8000",
      slug: "mas-8000",
      description:
        "Especialistas en montañismo, trekking y escalada. Equipación técnica para outdoor.",
      isFeatured: true,
      position: 2,
    },
  ];

  for (const b of brands) {
    await db.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, description: b.description },
      create: b,
    });
  }

  // ----------------------------- CATEGORÍAS PADRE -------------------------
  const rootCategories = [
    { name: "Running", slug: "running", description: "Zapatillas, ropa y técnica para corredores.", position: 1, isFeatured: true },
    { name: "Pádel", slug: "padel", description: "Palas, pelotas y equipación para pádel.", position: 2, isFeatured: true },
    { name: "Montaña", slug: "montana", description: "Trekking, escalada y outdoor.", position: 3, isFeatured: true },
    { name: "Fitness", slug: "fitness", description: "Material y ropa para entrenamiento en sala.", position: 4 },
    { name: "Calzado", slug: "calzado", description: "Zapatillas deportivas y para el día a día.", position: 5, isFeatured: true },
    { name: "Casual / Urban", slug: "casual", description: "Moda deportiva para la calle.", position: 6 },
    { name: "Complementos", slug: "complementos", description: "Mochilas, calcetines, riñoneras, gorras y accesorios.", position: 7 },
    { name: "Tenis", slug: "tenis", description: "Raquetas, encordados, pelotas y ropa para tenis.", position: 8 },
  ];

  for (const c of rootCategories) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        position: c.position,
        isFeatured: c.isFeatured ?? false,
      },
      create: c,
    });
  }

  // ----------------------------- SETTINGS ---------------------------------
  const settings: Array<{ key: string; value: unknown }> = [
    {
      key: "store.nap",
      value: {
        legalName: "Zona Sport",
        cif: "",
        streetAddress: "C. Silos, 3",
        postalCode: "06490",
        locality: "Puebla de la Calzada",
        region: "Badajoz",
        country: "ES",
        phone: "+34 689 11 06 91",
        whatsapp: "34689110691",
        email: "hola@zonasport.es",
        geo: { lat: 38.881, lng: -6.622 },
      },
    },
    {
      key: "store.hours",
      value: {
        weekdays: [
          { open: "10:00", close: "14:00" },
          { open: "17:00", close: "20:00" },
        ],
        saturday: [{ open: "10:00", close: "14:00" }],
        sunday: [],
      },
    },
    {
      key: "store.social",
      value: { facebook: "", instagram: "", gmap: "", twitter: "" },
    },
    {
      key: "seo.defaults",
      value: {
        titleSuffix: " | Zona Sport — Puebla de la Calzada",
        defaultOgImage: "/og-default.png",
        googleVerification: process.env.GOOGLE_SITE_VERIFICATION || "",
      },
    },
    {
      key: "site.banner",
      value: {
        enabled: true,
        text: "Pagos online próximamente · Atendemos por WhatsApp",
        link: "",
      },
    },
  ];

  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: { value: s.value as object },
      create: { key: s.key, value: s.value as object },
    });
  }

  // ----------------------------- PRODUCTOS DEMO ---------------------------
  let demoCreated = 0;
  let demoSkipped = 0;
  let demoFailed = 0;
  const demoFailures: Array<{ slug: string; error: string }> = [];
  for (const p of DEMO_PRODUCTS) {
    try {
      // El demo puede traer un slug distinto al canónico ("8000" vs "mas-8000").
      // Buscamos la marca por slug O por name (ambos son @unique en Prisma) para
      // evitar Unique constraint failed sobre `name` cuando dos slugs apuntan a
      // la misma marca real.
      let brand = await db.brand.findFirst({
        where: { OR: [{ slug: p.brand.slug }, { name: p.brand.name }] },
        select: { id: true },
      });
      if (!brand) {
        brand = await db.brand.create({
          data: { name: p.brand.name, slug: p.brand.slug, isFeatured: true },
          select: { id: true },
        });
      }

      let category = await db.category.findFirst({
        where: { OR: [{ slug: p.category.slug }, { name: p.category.name }] },
        select: { id: true },
      });
      if (!category) {
        category = await db.category.create({
          data: { name: p.category.name, slug: p.category.slug, position: 99 },
          select: { id: true },
        });
      }

      const externalId = `demo:${p.slug}`;
      const existing = await db.product.findUnique({
        where: { source_externalId: { source: "LOCAL", externalId } },
        select: { id: true },
      });
      if (existing) {
        demoSkipped++;
        continue;
      }

      await db.product.create({
        data: {
          slug: p.slug,
          name: p.name,
          shortName: p.shortName,
          colorName: p.colorName,
          modelCode: p.modelCode,
          source: "LOCAL",
          externalId,
          gender: "NO_ESPECIFICADO",
          retailPrice: p.retailPrice.toFixed(2),
          salePrice: p.salePrice != null ? p.salePrice.toFixed(2) : null,
          mainImageUrl: p.mainImageUrl,
          status: "ACTIVE",
          isFeatured: true,
          publishedAt: new Date(),
          brand: { connect: { id: brand.id } },
          category: { connect: { id: category.id } },
          images: {
            create: [
              {
                url: p.mainImageUrl,
                alt: p.name,
                position: 0,
                source: "demo-seed",
              },
            ],
          },
        },
      });
      demoCreated++;
    } catch (err) {
      demoFailed++;
      const msg = (err as Error).message;
      demoFailures.push({ slug: p.slug, error: msg.slice(0, 240) });
      console.warn(`[seed] demo "${p.slug}" no sembrado: ${msg}`);
    }
  }

  // ----------------------------- POST BIENVENIDA --------------------------
  await db.blogPost.upsert({
    where: { slug: "bienvenidos-a-la-nueva-tienda-online-de-zona-sport" },
    update: {},
    create: {
      slug: "bienvenidos-a-la-nueva-tienda-online-de-zona-sport",
      title: "Bienvenidos a la nueva tienda online de Zona Sport",
      excerpt:
        "Estrenamos web. Te contamos qué encontrarás, cómo reservar por WhatsApp y qué vendrá próximamente.",
      contentMd: `## Estrenamos web

Llevamos muchos años en Puebla de la Calzada equipando a corredores, paddleros, montañeros y a cualquiera que quiera moverse. Hoy damos el salto al online con esta nueva tienda.

## Qué vas a encontrar

- **Catálogo multimarca** con John Smith, +8000 y muchas más en camino.
- **Fichas detalladas** con composición, tallaje real y stock por talla.
- **Atención por WhatsApp** desde cualquier ficha de producto: pregúntanos antes de comprar.
- **Recogida en tienda**: reserva, te avisamos y pásate.

## Pagos online: próximamente

Estamos terminando de habilitar la pasarela de pago. Mientras tanto, todas las compras se gestionan por WhatsApp o en tienda física. Si te falta algo, escríbenos.

## Visítanos

Estamos en **C. Silos, 3, 06490 Puebla de la Calzada (Badajoz)**. Abrimos de lunes a viernes de 10 a 14 y de 17 a 20, y los sábados por la mañana.

¡Nos vemos en la tienda!
`,
      author: "Equipo Zona Sport",
      tags: ["tienda", "noticias", "puebla-de-la-calzada"],
      status: "PUBLISHED",
      publishedAt: new Date(),
      metaTitle: "Bienvenidos a la nueva tienda online de Zona Sport",
      metaDescription:
        "Estrenamos web en Zona Sport. Catálogo multimarca, atención por WhatsApp y recogida en tienda en Puebla de la Calzada (Badajoz).",
    },
  });

  return {
    admin: { email: ownerEmail, created: ownerCreated },
    brands: brands.length,
    categories: rootCategories.length,
    settings: settings.length,
    demoProducts: {
      created: demoCreated,
      existed: demoSkipped,
      failed: demoFailed,
      failures: demoFailures.length > 0 ? demoFailures : undefined,
    },
    blogPosts: 1,
    durationMs: Date.now() - t0,
  };
}
