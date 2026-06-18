import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { formatPriceEUR } from "@/lib/utils";
import { effectivePrice } from "@/lib/price";

export const runtime = "nodejs";
export const alt = "Zona Sport — Producto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagen Open Graph del producto (1200×630). Lo que ve quien comparte el enlace
 * en WhatsApp, redes, etc. Dos columnas: foto real del producto a la izquierda
 * (sobre blanco) + ficha (marca, nombre, color, precio/descuento) a la derecha
 * sobre el degradado de marca. Si el producto no tiene foto, cae a una sola
 * columna centrada.
 */
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
      mainImageUrl: true,
      brand: { select: { name: true } },
    },
  });

  const title = p?.shortName ?? p?.name ?? "Zona Sport";
  const brand = p?.brand?.name ?? "Zona Sport";
  const color = p?.colorName && p.colorName !== "Único" ? p.colorName : "";
  const photo = p?.mainImageUrl ?? null;

  const pr = p
    ? effectivePrice(Number(p.retailPrice), p.salePrice != null ? Number(p.salePrice) : null)
    : null;
  const price = pr ? formatPriceEUR(pr.final.toNumber()) : "";
  const oldPrice = pr && pr.onSale ? formatPriceEUR(pr.retail.toNumber()) : "";
  const discount = pr && pr.onSale ? `-${pr.discountPct}%` : "";

  const titleShort = title.length > 64 ? title.slice(0, 64) + "…" : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#14225b",
          fontFamily: "sans-serif",
        }}
      >
        {/* Columna foto (solo si hay imagen) */}
        {photo ? (
          <div
            style={{
              display: "flex",
              width: 470,
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              padding: 36,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              width={398}
              height={558}
              style={{ width: 398, height: 558, objectFit: "contain" }}
              alt=""
            />
          </div>
        ) : null}

        {/* Columna ficha */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            padding: 64,
            background: "linear-gradient(135deg, #14225b 0%, #1e3a8a 100%)",
            color: "white",
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

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {discount ? (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  padding: "6px 16px",
                  borderRadius: 999,
                  background: "#dc2626",
                  fontSize: 24,
                  fontWeight: 800,
                }}
              >
                {discount}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontSize: photo ? 56 : 72,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -1.5,
              }}
            >
              {titleShort}
            </div>
            {color ? (
              <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.75)" }}>
                Color: {color}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {price ? (
                <div
                  style={{
                    display: "flex",
                    padding: "14px 28px",
                    background: "#dc2626",
                    borderRadius: 16,
                    fontSize: 44,
                    fontWeight: 800,
                  }}
                >
                  {price}
                </div>
              ) : null}
              {oldPrice ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    color: "rgba(255,255,255,0.6)",
                    textDecoration: "line-through",
                  }}
                >
                  {oldPrice}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.7)" }}>
              Puebla de la Calzada
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
