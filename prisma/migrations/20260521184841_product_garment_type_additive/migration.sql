-- ============================================================================
-- Migración ADITIVA — product_garment_type_additive
-- ============================================================================
-- Bloque 6: añade Product.garmentType (nullable) para clasificar el textil
-- por tipo de prenda (camiseta, sudadera, chaqueta, abrigo, cortavientos,
-- chandal, conjunto, pantalon, bermuda, mallas, banador, falda, calentador,
-- vestido, chaleco). Valores controlados por GARMENT_TYPES en
-- lib/categories/garment.ts.
--
-- 100% aditiva. Sin DROPs. No toca categoryId ni primaryCategoryId. No toca
-- ProductSize ni el FTS. Reversible con: ALTER TABLE "Product" DROP COLUMN
-- "garmentType";
-- ============================================================================

ALTER TABLE "Product" ADD COLUMN "garmentType" TEXT;
CREATE INDEX "Product_garmentType_idx" ON "Product"("garmentType");
