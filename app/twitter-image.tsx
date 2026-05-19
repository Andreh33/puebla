import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Zona Sport — Tienda de deportes en Puebla de la Calzada (Badajoz)";
export const size = { width: 1200, height: 675 };
export const contentType = "image/png";

/**
 * Twitter card (1200x675). Composición similar al OG pero con la ratio
 * 16:9 que prefiere Twitter / X para evitar recortes.
 */
export default async function TwitterCard() {
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
            "radial-gradient(circle at 80% 20%, #1e3a8a 0%, #14225b 55%, #0b1338 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "60px 80px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.32)",
            filter: "blur(24px)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            ZS
          </div>
          <span style={{ fontSize: 22, fontWeight: 600, opacity: 0.85 }}>zonasport.es</span>
        </div>

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
              fontSize: 140,
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
              fontSize: 140,
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
              fontSize: 28,
              marginTop: 24,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 900,
              lineHeight: 1.3,
              display: "flex",
            }}
          >
            Multimarca deportiva en Puebla de la Calzada. Envíos a toda España.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 16,
            color: "rgba(255,255,255,0.6)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: 20,
          }}
        >
          <span>C. Silos, 3 · 06490 Badajoz</span>
          <span>+34 689 110 691</span>
        </div>
      </div>
    ),
    size,
  );
}
