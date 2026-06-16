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
];
