-- ============================================================================
-- Migración ADITIVA — product_garment_variant_additive
-- ============================================================================
-- Bloque 6 §18 Fase 3.5: añade Product.garmentVariant (nullable) para la
-- variante fina de la prenda (manga corta/larga, pantalón corto/largo,
-- mallas piratas, top, tirantes). Valores controlados por GARMENT_VARIANTS
-- en lib/categories/garment.ts.
--
-- 100% aditiva. Sin DROPs. No toca garmentType ni ningún otro campo.
-- Reversible con: ALTER TABLE "Product" DROP COLUMN "garmentVariant";
-- ============================================================================

ALTER TABLE "Product" ADD COLUMN "garmentVariant" TEXT;
CREATE INDEX "Product_garmentVariant_idx" ON "Product"("garmentVariant");
