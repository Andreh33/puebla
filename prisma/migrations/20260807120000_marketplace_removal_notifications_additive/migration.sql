-- Avisos persistentes para retirar de marketplaces productos ya vendidos.
-- 100% ADITIVO: añade dos columnas con DEFAULT y crea una tabla nueva.
-- No modifica ni elimina productos, pedidos, stock ni datos existentes.

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "isOnMiravia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isOnAmazon" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MarketplaceRemovalNotification" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "marketplace" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "quantitySold" INTEGER NOT NULL DEFAULT 1,
    "saleCount" INTEGER NOT NULL DEFAULT 1,
    "lastOrderId" TEXT,
    "firstSoldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSoldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceRemovalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceRemovalNotification_productId_marketplace_key"
ON "MarketplaceRemovalNotification"("productId", "marketplace");

-- CreateIndex
CREATE INDEX "MarketplaceRemovalNotification_resolvedAt_lastSoldAt_idx"
ON "MarketplaceRemovalNotification"("resolvedAt", "lastSoldAt");

-- CreateIndex
CREATE INDEX "MarketplaceRemovalNotification_marketplace_resolvedAt_idx"
ON "MarketplaceRemovalNotification"("marketplace", "resolvedAt");

-- AddForeignKey: SET NULL conserva el aviso si el producto se borra después.
ALTER TABLE "MarketplaceRemovalNotification"
ADD CONSTRAINT "MarketplaceRemovalNotification_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
