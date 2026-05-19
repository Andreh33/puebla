import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const revalidate = 3600;

/**
 * `robots.txt` dinámico:
 *  - Bloquea zonas de admin, API, búsqueda interna y previsualizaciones.
 *  - Permite explícitamente Mediapartners-Google (AdSense).
 *  - Para bots de scraping IA (GPTBot, anthropic-ai, CCBot, Claude-Web, Google-Extended),
 *    el setting `seo.allowAI` decide. Si está a `false`, los bloquea.
 *  - Apunta a `sitemap.xml` y a los sub-sitemaps.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  let allowAI = true;
  try {
    const setting = await db.setting.findUnique({ where: { key: "seo.allowAI" } });
    if (setting && typeof setting.value === "boolean") allowAI = setting.value;
    else if (setting && typeof setting.value === "object" && setting.value !== null) {
      const v = (setting.value as { allow?: boolean }).allow;
      if (typeof v === "boolean") allowAI = v;
    }
  } catch {
    // En build sin DB asumimos permisivo.
  }

  const AI_BOTS = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "anthropic-ai",
    "Claude-Web",
    "ClaudeBot",
    "CCBot",
    "Google-Extended",
    "PerplexityBot",
    "Bytespider",
    "Amazonbot",
  ];

  const baseDisallow = ["/admin", "/api", "/buscar", "/*?preview=", "/*?utm_"];

  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "*",
      allow: "/",
      disallow: baseDisallow,
    },
    // AdSense / Mediapartners — debe rastrearlo todo para servir anuncios.
    {
      userAgent: "Mediapartners-Google",
      allow: "/",
    },
  ];

  if (allowAI) {
    rules.push({ userAgent: AI_BOTS, allow: "/", disallow: ["/admin", "/api"] });
  } else {
    rules.push({ userAgent: AI_BOTS, disallow: "/" });
  }

  return {
    rules,
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-products.xml`,
      `${SITE_URL}/sitemap-posts.xml`,
    ],
    host: SITE_URL,
  };
}
