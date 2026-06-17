-- ============================================================================
-- Migración ADITIVA — customer_table_additive
-- ============================================================================
-- Crea la tabla "Customer": libreta de clientes reutilizable del TPV. Se rellena
-- al pulsar "Guardar cliente" en la caja y, best-effort, en cada venta presencial
-- con nombre o teléfono. Los pedidos conservan su customerName/customerPhone
-- denormalizado; no hay FK (la deduplicación se hace por teléfono o nombre).
--
-- 100% aditiva: solo CREATE TABLE + índices. Sin DROPs, sin tocar tablas
-- existentes. Las filas existentes no se ven afectadas. Reversible con:
--   DROP TABLE "Customer";
-- ============================================================================

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
