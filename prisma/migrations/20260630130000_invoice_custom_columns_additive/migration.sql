-- Columnas personalizadas para las facturas de proveedores. 100% ADITIVO:
--   - nueva columna SupplierInvoice."customValues" (JSONB, default '{}')
--   - nueva tabla "InvoiceColumn" (definición global de columnas custom)
-- No altera datos existentes (la columna nueva toma el default en las filas ya
-- creadas).
-- Reversible con:
--   ALTER TABLE "SupplierInvoice" DROP COLUMN "customValues";
--   DROP TABLE "InvoiceColumn";

-- AlterTable
ALTER TABLE "SupplierInvoice" ADD COLUMN "customValues" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "InvoiceColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 160,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceColumn_position_idx" ON "InvoiceColumn"("position");
