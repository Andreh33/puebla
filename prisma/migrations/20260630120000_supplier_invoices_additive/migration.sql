-- Facturas de proveedores (cuentas por pagar). 100% ADITIVO: solo CREATE TABLE,
-- índices y FK nuevos; no altera ninguna tabla existente.
-- Reversible con:
--   DROP TABLE "SupplierInvoiceDueDate";
--   DROP TABLE "SupplierInvoice";

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "brandLabel" TEXT,
    "invoiceNumber" TEXT,
    "concept" TEXT,
    "issueDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoiceDueDate" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInvoiceDueDate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierInvoice_supplier_idx" ON "SupplierInvoice"("supplier");

-- CreateIndex
CREATE INDEX "SupplierInvoice_issueDate_idx" ON "SupplierInvoice"("issueDate");

-- CreateIndex
CREATE INDEX "SupplierInvoiceDueDate_invoiceId_idx" ON "SupplierInvoiceDueDate"("invoiceId");

-- CreateIndex
CREATE INDEX "SupplierInvoiceDueDate_paid_dueDate_idx" ON "SupplierInvoiceDueDate"("paid", "dueDate");

-- AddForeignKey
ALTER TABLE "SupplierInvoiceDueDate" ADD CONSTRAINT "SupplierInvoiceDueDate_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
