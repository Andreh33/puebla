/**
 * Seed inicial de Zona Sport.
 * - Crea un usuario OWNER (credenciales en SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD).
 * - Crea las dos marcas del PRICAT: John Smith y +8000.
 * - Crea las categorías padre del catálogo objetivo (algunas vacías al inicio).
 * - Crea ajustes (Setting) iniciales: storeNAP, storeHours, social, SEO defaults.
 * - Inserta un post de blog de bienvenida.
 *
 * Idempotente: usar `upsert` para no duplicar al re-ejecutar.
 *
 * Ejecutar: npm run seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seed: Zona Sport\n");

  // ----------------------------- ADMIN OWNER ------------------------------
  const ownerEmail = (process.env.SEED_OWNER_EMAIL || "admin@zonasport.es").toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "ChangeMe2026!";
  const ownerName = process.env.SEED_OWNER_NAME || "Administrador Zona Sport";

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const owner = await db.adminUser.upsert({
    where: { email: ownerEmail },
    update: { name: ownerName, role: "OWNER", isActive: true },
    create: {
      email: ownerEmail,
      passwordHash,
      name: ownerName,
      role: "OWNER",
      isActive: true,
    },
  });
  console.log(`✓ Admin OWNER: ${owner.email}`);

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
    console.log(`✓ Brand: ${b.name}`);
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
      update: { name: c.name, description: c.description, position: c.position, isFeatured: c.isFeatured ?? false },
      create: c,
    });
    console.log(`✓ Category: ${c.name}`);
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
        weekdays: [{ open: "10:00", close: "14:00" }, { open: "17:00", close: "20:00" }],
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
  console.log(`✓ Settings: ${settings.length} claves`);

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

¡Nos vemos en la tienda! 👟⛰️🎾
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
  console.log("✓ BlogPost: post de bienvenida");

  console.log("\n✅ Seed completado");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
