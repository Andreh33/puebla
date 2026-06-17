-- ============================================================================
-- Migración ADITIVA — product_is_outlet_additive
-- ============================================================================
-- Añade Product.isOutlet (boolean, default false) para marcar productos que
-- deben aparecer ADEMÁS en la sección /outlet (textil/calzado). El flag NO los
-- quita de su categoría normal: un producto outlet sale a la vez en su sitio
-- habitual Y en /outlet. Espejo de isFeatured.
--
-- 100% aditiva, NOT NULL con DEFAULT false (las filas existentes quedan false).
-- Sin DROPs. No toca ningún otro campo. Índice espejo de isFeatured/status para
-- el listado del outlet. Reversible con:
--   DROP INDEX "Product_isOutlet_status_idx";
--   ALTER TABLE "Product" DROP COLUMN "isOutlet";
-- ============================================================================

ALTER TABLE "Product" ADD COLUMN "isOutlet" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Product_isOutlet_status_idx" ON "Product"("isOutlet", "status");
