-- ============================================================================
-- Migración ADITIVA — product_footwear_type_additive
-- ============================================================================
-- Bloque 3: añade Product.footwearType (nullable) para clasificar el calzado
-- por uso (running, trail, tenis, padel, casual, baloncesto, futbol,
-- futbol_sala, chanclas). Valores controlados por FOOTWEAR_TYPES en
-- lib/categories/footwear.ts.
--
-- 100% aditiva. Sin DROPs. No toca categoryId ni primaryCategoryId. No toca
-- ProductSize ni el FTS. Reversible con: ALTER TABLE "Product" DROP COLUMN
-- "footwearType";
-- ============================================================================

ALTER TABLE "Product" ADD COLUMN "footwearType" TEXT;
CREATE INDEX "Product_footwearType_idx" ON "Product"("footwearType");
