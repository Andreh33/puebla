import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import { translate } from "@/lib/i18n/dictionaries";
import { publishedImageLocale } from "@/lib/i18n/image-locale";
import { ImageResponse } from "next/og";
import { publicDatabase } from "@/lib/i18n/public-db";

export const runtime = "nodejs";
export const alt = "Artículo del blog Zona Sport";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string; locale?: string }> }) {
  const { slug, locale: rawLocale } = await params;
  const locale = publishedImageLocale(rawLocale);
  if (!locale) return new Response("Not found", { status: 404 });
  const t = (source:string) => translate(locale,source);
  const db = publicDatabase(locale);
  let title: string;
  try {
    const post = await db.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
      },
      select: { title: true },
    });
    if (!post) return new Response("Not found", { status: 404 });
    title = post.title;
  } catch {
    return new Response("Service unavailable", { status: 503 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background:
            "linear-gradient(135deg, #14225b 0%, #1e3a8a 50%, #182d6a 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "white",
            }}
          >
            {t("ZS")}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>{t("Zona Sport")}</span>
            <span style={{ fontSize: 16, opacity: 0.75 }}>{t("Puebla de la Calzada · Blog")}</span>
          </div>
        </div>

        {/* Adorno geométrico: círculo en degradado. (No usamos <img src=.svg>
            porque Satori NO rasteriza SVG referenciado por src dentro del
            ImageResponse → quedaría vacío/roto.) */}
        <div
          style={{
            position: "absolute",
            right: -180,
            bottom: -180,
            width: 800,
            height: 800,
            borderRadius: 400,
            background:
              "radial-gradient(circle at 30% 30%, rgba(200,218,70,0.18), rgba(220,38,38,0.10) 60%, transparent 75%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#c8da46",
              marginBottom: 16,
            }}
          >
            {t("Artículo del blog")}</span>
          <span
            style={{
              fontSize: title.length > 60 ? 56 : 68,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            {tx(title)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, opacity: 0.8 }}>{tx(new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://zonasportpuebla.com").hostname)}{t("/blog")}</span>
          <span style={{ fontSize: 18, opacity: 0.7 }}>{t("Equipamiento deportivo multimarca")}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
