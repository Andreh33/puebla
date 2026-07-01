-- Registro de proveedores (lista guardada para el desplegable). 100% ADITIVO:
--   - nueva tabla "Supplier" (id, name único, timestamps)
--   - se SIEMBRA con los proveedores ya existentes en "SupplierInvoice"
--     (nombres distintos, recortados y no vacíos).
-- No altera ninguna tabla existente.
-- Reversible con: DROP TABLE "Supplier";

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- Siembra: un Supplier por cada proveedor distinto ya presente en las facturas.
-- gen_random_uuid()::text sirve de id (basta con ser único; no tiene por qué ser
-- un cuid). DISTINCT + TRIM evita duplicados y espacios; se excluyen los vacíos.
INSERT INTO "Supplier" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT TRIM("supplier") AS s
    FROM "SupplierInvoice"
    WHERE TRIM(COALESCE("supplier", '')) <> ''
) AS distinct_suppliers
ON CONFLICT ("name") DO NOTHING;
