-- ============================================================================
-- Migración CONTRACTIVA — product_categories_m2m_contract
-- ============================================================================
-- Parte 2 de la estrategia expand/contract del Bloque 2 (reestructura de
-- categorías textil/calzado/accesorios). Esta migración elimina la columna
-- y FK antigua Product.categoryId, ahora reemplazada por la combinación
-- Product.primaryCategoryId (canonical) + tabla pivote ProductCategory (m2m).
--
-- ⚠️ PUNTO DE NO RETORNO — NO ejecutar hasta cumplir los 3 requisitos:
--
--   1. CERO referencias a Product.categoryId en el código de la app:
--      grep -rn "categoryId" app/ components/ lib/ | grep -v "primaryCategoryId" \
--        | grep -v "ProductCategory" | grep -v "node_modules" | wc -l   ->   debe ser 0
--      (los 37 archivos detectados en §10 del plan deben haberse migrado
--      todos a primaryCategoryId / categories[].)
--
--   2. CERO productos con primaryCategoryId NULL, salvo los 6 etiquetados
--      a mano desde el filtro "Sin categorizar" del admin:
--      SELECT COUNT(*) FROM "Product" WHERE "primaryCategoryId" IS NULL;
--      -> debe ser 0 (o <= los explícitamente decididos vía migration-errors.csv)
--
--   3. Backup completo de producción hecho (pg_dump branch main de Neon),
--      con verificación de restore en una rama desechable.
--
-- Tras aplicar esta migración, a nivel Prisma:
--   - La relación @relation("LegacyCategory") desaparece del schema.
--   - @relation("PrimaryCategory") (primaryCategory) se renombra a `category`
--     en schema.prisma (la app vuelve a `product.category`, ahora apuntando
--     a primaryCategoryId).
--   - Ese rename Prisma NO se ejecuta vía SQL, solo en el schema. Hacer
--     `prisma generate` tras editarlo.
-- ============================================================================

-- 1. Eliminar la FK antigua que ataba Product.categoryId -> Category.id
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- 2. Eliminar el índice compuesto antiguo que ya no aporta (lo sustituye
--    el índice de primaryCategoryId creado en la migración aditiva, y el
--    índice de ProductCategory.categoryId para queries m2m).
DROP INDEX "Product_categoryId_status_idx";

-- 3. Promover primaryCategoryId a NOT NULL ahora que todos los productos
--    activos tienen un canonical asignado (los 6 sin categorizar deben
--    haberse etiquetado a mano antes de llegar aquí).
ALTER TABLE "Product" ALTER COLUMN "primaryCategoryId" SET NOT NULL;

-- 4. Eliminar la columna vieja categoryId. Cualquier referencia residual
--    fallará a partir de aquí — por eso el requisito 1 es bloqueante.
ALTER TABLE "Product" DROP COLUMN "categoryId";
