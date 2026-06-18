-- ============================================================================
-- Migración ADITIVA — order_holded_invoice_additive
-- ============================================================================
-- Añade a "Order" tres columnas para la facturación fiscal vía Holded/VeriFactu:
--   · holdedDocId          — id del documento (factura) en Holded. Guarda
--                            idempotente: si está, el pedido ya se facturó.
--   · holdedInvoiceNumber  — nº de factura legible que devuelve Holded.
--   · invoicedAt           — cuándo se emitió la factura.
--
-- Modelo B: solo se facturan por aquí los pedidos online y las facturas a
-- petición; las ventas de tienda (TPV) NO. Todas las columnas son NULLABLE.
--
-- 100% aditiva: solo ADD COLUMN. Sin DROPs, sin defaults, sin tocar datos
-- existentes (las filas actuales quedan con NULL en las tres). Reversible con:
--   ALTER TABLE "Order" DROP COLUMN "holdedDocId",
--     DROP COLUMN "holdedInvoiceNumber", DROP COLUMN "invoicedAt";
-- ============================================================================

ALTER TABLE "Order" ADD COLUMN "holdedDocId" TEXT;
ALTER TABLE "Order" ADD COLUMN "holdedInvoiceNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "invoicedAt" TIMESTAMP(3);
