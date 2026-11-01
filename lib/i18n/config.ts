export const LOCALES = ["es", "pt", "it", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export type ForeignLocale = Exclude<Locale, "es">;
export const LOCALE_INFO = {
  es: {
    language: "es-ES",
    og: "es_ES",
    name: "Español",
    homeTitle: "Tienda de deportes en Puebla de la Calzada",
    skip: "Saltar al contenido",
  },
  pt: {
    language: "pt-PT",
    og: "pt_PT",
    name: "Português",
    homeTitle: "Loja de desporto em Puebla de la Calzada",
    skip: "Saltar para o conteúdo",
  },
  it: {
    language: "it-IT",
    og: "it_IT",
    name: "Italiano",
    homeTitle: "Negozio di articoli sportivi a Puebla de la Calzada",
    skip: "Vai al contenuto",
  },
  fr: {
    language: "fr-FR",
    og: "fr_FR",
    name: "Français",
    homeTitle: "Magasin de sport à Puebla de la Calzada",
    skip: "Aller au contenu",
  },
  de: {
    language: "de-DE",
    og: "de_DE",
    name: "Deutsch",
    homeTitle: "Sportgeschäft in Puebla de la Calzada",
    skip: "Zum Inhalt springen",
  },
} as const;
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : "es";
}
