import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { formatPriceEUR } from "@/lib/utils";
import { effectivePrice } from "@/lib/price";

export const runtime = "nodejs";
export const alt = "Zona Sport — Producto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.product.findUnique({
    where: { slug },
    select: {
      name: true,
      shortName: true,
      colorName: true,
      retailPrice: true,
      salePrice: true,
      brand: { select: { name: true } },
    },
  });

  const title = p?.shortName ?? p?.name ?? "Zona Sport";
  const brand = p?.brand?.name ?? "Zona Sport";
  const color = p?.colorName && p.colorName !== "Único" ? p.colorName : "";
  const price = p
    ? formatPriceEUR(
        effectivePrice(Number(p.retailPrice), p.salePrice != null ? Number(p.salePrice) : null).final.toNumber(),
      )
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #14225b 0%, #1e3a8a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Zona Sport
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#c8da46" }}>
            {brand}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            {title.length > 70 ? title.slice(0, 70) + "…" : title}
          </div>
          {color && (
            <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.75)" }}>
              Color: {color}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          {price && (
            <div
              style={{
                display: "flex",
                padding: "16px 32px",
                background: "#dc2626",
                borderRadius: 16,
                fontSize: 48,
                fontWeight: 800,
              }}
            >
              {price}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
            zonasport.es · Puebla de la Calzada
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
