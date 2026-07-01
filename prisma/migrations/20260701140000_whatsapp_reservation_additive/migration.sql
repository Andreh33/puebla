-- Reservas por WhatsApp (se registran al pulsar "Reservar por WhatsApp").
-- 100% ADITIVO: solo CREATE TABLE + índices nuevos. No toca nada existente.
-- Reversible con: DROP TABLE "WhatsappReservation";

-- CreateTable
CREATE TABLE "WhatsappReservation" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "productName" TEXT,
    "sku" TEXT,
    "size" TEXT,
    "itemsCount" INTEGER,
    "amount" DECIMAL(10,2),
    "summary" TEXT NOT NULL,
    "sourcePage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappReservation_status_createdAt_idx" ON "WhatsappReservation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsappReservation_createdAt_idx" ON "WhatsappReservation"("createdAt");
