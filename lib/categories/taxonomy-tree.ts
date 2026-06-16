/**
 * Árbol de categorías canónico de Zona Sport (fuente única).
 *
 * Lo consumen:
 *   · scripts/migrate-categories.ts (migración CLI)
 *   · app/api/admin/apply-taxonomy/route.ts (upsert en prod vía HTTP)
 *
 * Nivel 0: raíces de género (hombre/mujer/nino/nina/bebe) + complementos.
 * Nivel 1: familia por género (`<gen>-textil`, `<gen>-calzado`) + hijos de
 * complementos (subfamilias finas que casan con classify.ts → accesorios:<x>).
 *
 * IMPORTANTE: el slug raíz de complementos sigue siendo "accesorios" (los
 * guards de UI dependen de él); solo cambia el NOMBRE visible a "Complementos".
 */
export type TaxonomyNode = {
  slug: string;
  name: string;
  parentSlug: string | null;
  position: number;
  metaTitle: string;
  metaDescription: string;
};

const GENEROS: Array<{ slug: string; name: string; position: number }> = [
  { slug: "hombre", name: "Hombre", position: 1 },
  { slug: "mujer", name: "Mujer", position: 2 },
  { slug: "nino", name: "Niño", position: 3 },
  { slug: "nina", name: "Niña", position: 4 },
  { slug: "bebe", name: "Bebé", position: 5 },
];

// Subfamilias de complementos — el sufijo del slug DEBE coincidir con la parte
// tras "accesorios:" en classify.ts (accesorios-<suffix>).
const CALZADO_TIPOS: Array<{ slug: string; name: string }> = [
  { slug: "running", name: "Running" },
  { slug: "trail", name: "Trail / Montaña" },
  { slug: "padel", name: "Tenis / Pádel" },
  { slug: "futbol", name: "Fútbol" },
  { slug: "futbol-sala", name: "Fútbol sala" },
  { slug: "casual", name: "Casual" },
  { slug: "baloncesto", name: "Baloncesto" },
  { slug: "chanclas", name: "Chanclas" },
];
const TEXTIL_TIPOS: Array<{ slug: string; name: string }> = [
  { slug: "camiseta", name: "Camisetas" },
  { slug: "polo", name: "Polos" },
  { slug: "sudadera", name: "Sudaderas" },
  { slug: "polar", name: "Polares" },
  { slug: "chandal", name: "Chándal" },
  { slug: "chaqueta", name: "Chaquetas" },
  { slug: "abrigo", name: "Abrigos" },
  { slug: "cortavientos", name: "Cortavientos" },
  { slug: "conjunto", name: "Conjuntos" },
  { slug: "pantalon", name: "Pantalones" },
  { slug: "mallas", name: "Mallas y leggins" },
  { slug: "banador", name: "Bañadores" },
];

// Nivel 3 (4º nivel del árbol): variantes finas de prenda bajo el nodo de tipo
// textil. tirantes/top SOLO en mujer+niña; el resto en los 4 géneros principales
// (sin bebé). El slug es `<gen>-textil-<prenda>-<variante>`.
const TEXTIL_VARIANTES: Array<{ tipo: string; variantes: Array<{ slug: string; name: string; soloGeneros?: string[] }> }> = [
  { tipo: "camiseta", variantes: [
    { slug: "manga-corta", name: "Manga corta" },
    { slug: "manga-larga", name: "Manga larga" },
    { slug: "tirantes", name: "Tirantes", soloGeneros: ["mujer", "nina"] },
    { slug: "top", name: "Top", soloGeneros: ["mujer", "nina"] },
  ]},
  { tipo: "pantalon", variantes: [
    { slug: "corto", name: "Pantalón corto" },
    { slug: "largo", name: "Pantalón largo" },
  ]},
  { tipo: "mallas", variantes: [
    { slug: "cortas", name: "Mallas cortas" },
    { slug: "largas", name: "Mallas largas" },
    { slug: "piratas", name: "Mallas piratas" },
  ]},
];
const VARIANT_GENEROS = GENEROS.filter((g) => g.slug !== "bebe"); // hombre, mujer, nino, nina

const COMPLEMENTOS_HIJOS: Array<{ suffix: string; name: string }> = [
  { suffix: "balones", name: "Balones" },
  { suffix: "billeteros", name: "Billeteros" },
  { suffix: "bolsos", name: "Bolsos" },
  { suffix: "calcetines", name: "Calcetines" },
  { suffix: "espinilleras", name: "Espinilleras" },
  { suffix: "gafas-natacion", name: "Gafas de natación" },
  { suffix: "gorras", name: "Gorras" },
  { suffix: "guantes", name: "Guantes" },
  { suffix: "mochilas", name: "Mochilas" },
  { suffix: "patinaje", name: "Patinaje" },
  { suffix: "rinonera", name: "Riñonera" },
  { suffix: "padel", name: "Pádel" },
  { suffix: "varios", name: "Varios" },
];

export const TAXONOMY_TREE: TaxonomyNode[] = [
  ...GENEROS.map((g) => ({
    slug: g.slug,
    name: g.name,
    parentSlug: null,
    position: g.position,
    metaTitle: `${g.name} — Ropa y calzado deportivo | Zona Sport`,
    metaDescription: `Equipación deportiva de ${g.name.toLowerCase()}: textil y calzado. Envío a toda España.`,
  })),
  {
    slug: "accesorios",
    name: "Complementos",
    parentSlug: null,
    position: 6,
    metaTitle: "Complementos deportivos | Zona Sport",
    metaDescription: "Mochilas, balones, calcetines, gorras, guantes y más complementos deportivos.",
  },
  ...GENEROS.flatMap((g) => [
    {
      slug: `${g.slug}-textil`,
      name: `Textil ${g.name.toLowerCase()}`,
      parentSlug: g.slug,
      position: 1,
      metaTitle: `Ropa de ${g.name.toLowerCase()} | Zona Sport`,
      metaDescription: `Camisetas, polos, sudaderas, chándales y abrigos de ${g.name.toLowerCase()}.`,
    },
    {
      slug: `${g.slug}-calzado`,
      name: `Calzado ${g.name.toLowerCase()}`,
      parentSlug: g.slug,
      position: 2,
      metaTitle: `Zapatillas y calzado de ${g.name.toLowerCase()} | Zona Sport`,
      metaDescription: `Zapatillas de running, pádel y casual para ${g.name.toLowerCase()}.`,
    },
  ]),
  ...COMPLEMENTOS_HIJOS.map((h, i) => ({
    slug: `accesorios-${h.suffix}`,
    name: h.name,
    parentSlug: "accesorios",
    position: i + 1,
    metaTitle: `${h.name} | Zona Sport`,
    metaDescription: `${h.name} deportivos multimarca en Zona Sport.`,
  })),
  ...GENEROS.flatMap((g) =>
    CALZADO_TIPOS.map((t, i) => ({
      slug: `${g.slug}-calzado-${t.slug}`,
      name: t.name,
      parentSlug: `${g.slug}-calzado`,
      position: i + 1,
      metaTitle: `${t.name} ${g.name.toLowerCase()} | Zona Sport`,
      metaDescription: `${t.name} de ${g.name.toLowerCase()} en Zona Sport.`,
    })),
  ),
  ...GENEROS.flatMap((g) =>
    TEXTIL_TIPOS.map((t, i) => ({
      slug: `${g.slug}-textil-${t.slug}`,
      name: t.name,
      parentSlug: `${g.slug}-textil`,
      position: i + 1,
      metaTitle: `${t.name} ${g.name.toLowerCase()} | Zona Sport`,
      metaDescription: `${t.name} de ${g.name.toLowerCase()} en Zona Sport.`,
    })),
  ),
  ...VARIANT_GENEROS.flatMap((g) =>
    TEXTIL_VARIANTES.flatMap(({ tipo, variantes }) =>
      variantes
        .filter((v) => !v.soloGeneros || v.soloGeneros.includes(g.slug))
        .map((v, i) => ({
          slug: `${g.slug}-textil-${tipo}-${v.slug}`,
          name: v.name,
          parentSlug: `${g.slug}-textil-${tipo}`,
          position: i + 1,
          metaTitle: `${v.name} ${g.name.toLowerCase()} | Zona Sport`,
          metaDescription: `${v.name} de ${g.name.toLowerCase()} en Zona Sport.`,
        })),
    ),
  ),
];

/** Slugs de los nodos de variante existentes (4º nivel) — para validar/derivar. */
export const VALID_VARIANT_SLUGS = new Set(
  TAXONOMY_TREE.filter((n) => /-textil-(?:camiseta|pantalon|mallas)-/.test(n.slug)).map((n) => n.slug),
);
