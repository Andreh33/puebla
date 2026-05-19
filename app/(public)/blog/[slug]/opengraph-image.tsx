import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "Artículo del blog Zona Sport";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: { slug: string } }) {
  let title = "Zona Sport — Blog";
  let cover: string | null = null;
  try {
    const post = await db.blogPost.findUnique({
      where: { slug: params.slug },
      select: { title: true, coverImageUrl: true, ogImageUrl: true },
    });
    if (post) {
      title = post.title;
      cover = post.ogImageUrl ?? post.coverImageUrl ?? null;
    }
  } catch {
    // ignore
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
            ZS
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>Zona Sport</span>
            <span style={{ fontSize: 16, opacity: 0.75 }}>Puebla de la Calzada · Blog</span>
          </div>
        </div>

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={cover}
            style={{
              position: "absolute",
              right: -180,
              bottom: -180,
              width: 800,
              height: 800,
              opacity: 0.18,
              objectFit: "cover",
              borderRadius: 400,
            }}
          />
        )}

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
            Artículo del blog
          </span>
          <span
            style={{
              fontSize: title.length > 60 ? 56 : 68,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, opacity: 0.8 }}>zonasport.es/blog</span>
          <span style={{ fontSize: 18, opacity: 0.7 }}>Equipamiento deportivo multimarca</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
