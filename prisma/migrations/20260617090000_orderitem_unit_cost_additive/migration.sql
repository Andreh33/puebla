-- ============================================================================
-- Migración ADITIVA — orderitem_unit_cost_additive
-- ============================================================================
-- Snapshot del coste unitario en el MOMENTO de la venta (margen histórico).
-- Lo rellenan lib/stripe/orders.ts (venta online) y lib/pos/sale.ts (TPV) con
-- el ProductSize.costPrice de la talla (o Product.costPrice) vigente al vender.
-- Permite calcular el beneficio aunque el coste cambie después.
--
-- 100% aditiva, nullable. Sin DROPs. No toca ningún otro campo.
-- Reversible con: ALTER TABLE "OrderItem" DROP COLUMN "unitCost";
-- ============================================================================

ALTER TABLE "OrderItem" ADD COLUMN "unitCost" DECIMAL(10,2);
