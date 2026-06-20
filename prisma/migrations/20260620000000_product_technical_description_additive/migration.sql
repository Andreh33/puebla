-- ============================================================================
-- Migración ADITIVA — product_technical_description_additive
-- ============================================================================
-- Añade Product.technicalDescription: descripción TÉCNICA en texto libre
-- (materiales, tecnología, cuidados…), independiente de `description`. Se muestra
-- en la ficha pública justo debajo de la descripción normal, y se copia al
-- duplicar un producto.
--
-- 100% aditiva, nullable. Sin DROPs, sin defaults, sin tocar datos existentes
-- (las filas actuales quedan con NULL). Reversible con:
--   ALTER TABLE "Product" DROP COLUMN "technicalDescription";
-- ============================================================================

ALTER TABLE "Product" ADD COLUMN "technicalDescription" TEXT;
