/** Public Google Maps snapshot, verified 2026-10-26. Short attributed excerpts; not a live API feed. */
export type ReviewLocale = "es" | "pt" | "it" | "fr" | "de";
export const GOOGLE_REVIEW_SOURCE = {
  url: "https://maps.app.goo.gl/ZNHviai5Zxd3rmJB8",
  rating: 4.9,
  count: 35,
  checkedAt: "2026-10-26",
} as const;
export const GOOGLE_REVIEW_AUTHORS = [
 { name: "Rubén Ramos Sosa", stars: 5, photo: "https://lh3.googleusercontent.com/a/ACg8ocIMKP9xYQcmR6H4weIxNOCs6bd7jKigNauWdKh2hiJJjIg-fw=w36-h36-p-rp-mo-ba12-br100" },
 { name: "Eugenio Quintero Romero", stars: 4, photo: "https://lh3.googleusercontent.com/a/ACg8ocJTT1G9XarWlxEWnZLLwprIk4inF3OPxRssJlEDplmUyi-n3w=w36-h36-p-rp-mo-ba12-br100" },
 { name: "Alejandro Palomo", stars: 5, photo: "https://lh3.googleusercontent.com/a-/ALV-UjXN3sLYZBIMQxnNtQgF0MPF8qd46X643YDtSZuDhA5pLf6HaFsCDw=w36-h36-p-rp-mo-br100" },
] as const;
export const REVIEW_COPY = {
 es: { title:"Lo que cuentan en Google", subtitle:"Opiniones sobre nuestra tienda de Puebla de la Calzada.", all:"Leer las 35 reseñas en Google", write:"Dejar una reseña en Google", excerpt:"Extracto de una reseña", checked:"Fuente: Google Maps. Consultado el 26/10/2026.", photo:"Foto de", quotes:["saben aconsejar a cada persona","Muy bien buen trato","Todo genial! Un trato excelente e inmejorable."] },
 pt: { title:"O que dizem no Google", subtitle:"Opiniões sobre a nossa loja em Puebla de la Calzada.", all:"Ler as 35 avaliações no Google", write:"Deixar uma avaliação no Google", excerpt:"Excerto traduzido de uma avaliação", checked:"Fonte: Google Maps. Consultado em 26/10/2026.", photo:"Fotografia de", quotes:["sabem aconselhar cada pessoa","Muito bom, bom atendimento","Tudo excelente! Um atendimento excelente e incomparável."] },
 it: { title:"Le opinioni su Google", subtitle:"Recensioni sul nostro negozio di Puebla de la Calzada.", all:"Leggi le 35 recensioni su Google", write:"Lascia una recensione su Google", excerpt:"Estratto tradotto di una recensione", checked:"Fonte: Google Maps. Consultato il 26/10/2026.", photo:"Foto di", quotes:["sanno consigliare ogni persona","Molto bene, ottimo trattamento","Tutto fantastico! Un trattamento eccellente e impareggiabile."] },
 fr: { title:"Les avis sur Google", subtitle:"Des avis sur notre boutique de Puebla de la Calzada.", all:"Lire les 35 avis sur Google", write:"Laisser un avis sur Google", excerpt:"Extrait traduit d’un avis", checked:"Source : Google Maps. Consultée le 26/10/2026.", photo:"Photo de", quotes:["ils savent conseiller chaque personne","Très bien, bon accueil","Tout était parfait ! Un accueil excellent et incomparable."] },
 de: { title:"Das sagen Kunden auf Google", subtitle:"Bewertungen unseres Geschäfts in Puebla de la Calzada.", all:"Alle 35 Bewertungen auf Google lesen", write:"Auf Google bewerten", excerpt:"Übersetzter Auszug aus einer Bewertung", checked:"Quelle: Google Maps. Abgerufen am 26.10.2026.", photo:"Foto von", quotes:["sie wissen jeden Menschen zu beraten","Sehr gut, freundlicher Umgang","Alles großartig! Eine ausgezeichnete und unübertroffene Betreuung."] },
} satisfies Record<ReviewLocale, {title:string;subtitle:string;all:string;write:string;excerpt:string;checked:string;photo:string;quotes:readonly string[]}>;
