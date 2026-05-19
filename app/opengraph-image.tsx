import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Zona Sport — Tienda de deportes en Puebla de la Calzada (Badajoz)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Open Graph principal del sitio. Composición vertical equilibrada: marca
 * en la franja superior, tagline descriptivo en el centro, NAP discreto al pie.
 */
export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background:
            "radial-gradient(circle at 20% 10%, #1e3a8a 0%, #14225b 55%, #0b1338 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "72px 80px",
          overflow: "hidden",
        }}
      >
        {/* Acento decorativo */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "rgba(220, 38, 38, 0.35)",
            filter: "blur(20px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -100,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.25)",
            filter: "blur(20px)",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            ZS
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontSize: 22, fontWeight: 600, opacity: 0.85 }}>
              zonasport.es
            </span>
            <span style={{ fontSize: 16, opacity: 0.6, marginTop: 4 }}>
              Multimarca · Puebla de la Calzada
            </span>
          </div>
        </div>

        {/* Wordmark central */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: 24,
          }}
        >
          <div
            style={{
              fontSize: 160,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              lineHeight: 0.9,
              display: "flex",
            }}
          >
            ZONA
          </div>
          <div
            style={{
              fontSize: 160,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              color: "#ef4444",
              lineHeight: 0.9,
              display: "flex",
              marginTop: 4,
            }}
          >
            SPORT
          </div>
          <div
            style={{
              fontSize: 30,
              marginTop: 28,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 900,
              lineHeight: 1.3,
              display: "flex",
            }}
          >
            Deportes, calzado y complementos en Badajoz. Atención cercana y envíos a toda España.
          </div>
        </div>

        {/* Footer NAP */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            color: "rgba(255,255,255,0.65)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: 24,
          }}
        >
          <span>C. Silos, 3 · 06490 Puebla de la Calzada</span>
          <span>+34 689 110 691</span>
        </div>
      </div>
    ),
    size,
  );
}
