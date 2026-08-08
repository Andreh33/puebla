import "server-only";
import type { Prisma } from "@/lib/db";

export const MIRAVIA_MARKETPLACE = "MIRAVIA" as const;
export const AMAZON_MARKETPLACE = "AMAZON" as const;

const MARKETPLACE_FLAGS = [
  { marketplace: MIRAVIA_MARKETPLACE, productFlag: "isOnMiravia" },
  { marketplace: AMAZON_MARKETPLACE, productFlag: "isOnAmazon" },
] as const;

export type MarketplaceSaleItem = {
  productId: string | null | undefined;
  quantity: number;
};

type MarketplaceSaleReference =
  | { orderId: string; reservationId?: never }
  | { reservationId: string; orderId?: never };

type RecordMarketplaceSaleInput = MarketplaceSaleReference & {
  items: MarketplaceSaleItem[];
  soldAt?: Date;
};

/**
 * Crea o actualiza los avisos de retirada de marketplaces dentro de la MISMA
 * transacción que registra la venta. Agrupa tallas/líneas del mismo producto y
 * mantiene un único aviso activo por producto y canal. Si el aviso ya se había
 * resuelto y el producto fue publicado de nuevo, lo reabre empezando un ciclo.
 */
export async function recordMarketplaceRemovalNotifications(
  tx: Prisma.TransactionClient,
  input: RecordMarketplaceSaleInput,
): Promise<number> {
  const quantityByProduct = new Map<string, number>();
  for (const item of input.items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) continue;
    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  if (quantityByProduct.size === 0) return 0;

  const products = await tx.product.findMany({
    where: {
      id: { in: [...quantityByProduct.keys()] },
      OR: [{ isOnMiravia: true }, { isOnAmazon: true }],
    },
    select: { id: true, name: true, sku: true, isOnMiravia: true, isOnAmazon: true },
  });
  if (products.length === 0) return 0;

  const soldAt = input.soldAt ?? new Date();
  const lastOrderId = "orderId" in input ? (input.orderId ?? null) : null;
  const lastReservationId = "reservationId" in input ? (input.reservationId ?? null) : null;
  let notificationsRecorded = 0;
  for (const product of products) {
    const quantitySold = quantityByProduct.get(product.id) ?? 0;
    if (quantitySold <= 0) continue;

    for (const config of MARKETPLACE_FLAGS) {
      if (!product[config.productFlag]) continue;
      notificationsRecorded += 1;

      // Si existía un ciclo ya resuelto, lo reabrimos y reiniciamos sus cifras.
      // updateMany hace el cambio condicionalmente y evita perder incrementos si
      // dos ventas del mismo producto llegan a la vez.
      const reopened = await tx.marketplaceRemovalNotification.updateMany({
        where: {
          productId: product.id,
          marketplace: config.marketplace,
          resolvedAt: { not: null },
        },
        data: {
          productName: product.name,
          productSku: product.sku,
          quantitySold,
          saleCount: 1,
          lastOrderId,
          lastReservationId,
          firstSoldAt: soldAt,
          lastSoldAt: soldAt,
          resolvedAt: null,
        },
      });
      if (reopened.count > 0) continue;

      await tx.marketplaceRemovalNotification.upsert({
        where: {
          productId_marketplace: {
            productId: product.id,
            marketplace: config.marketplace,
          },
        },
        create: {
          productId: product.id,
          marketplace: config.marketplace,
          productName: product.name,
          productSku: product.sku,
          quantitySold,
          saleCount: 1,
          lastOrderId,
          lastReservationId,
          firstSoldAt: soldAt,
          lastSoldAt: soldAt,
        },
        update: {
          productName: product.name,
          productSku: product.sku,
          quantitySold: { increment: quantitySold },
          saleCount: { increment: 1 },
          lastOrderId,
          lastReservationId,
          lastSoldAt: soldAt,
          resolvedAt: null,
        },
      });
    }
  }

  return notificationsRecorded;
}

type ResolveMarketplaceNotificationResult = {
  resolved: boolean;
  productId: string | null;
};

/**
 * Marca el aviso como resuelto sin borrarlo. También desmarca el marketplace
 * correspondiente en el producto, de modo que una venta posterior no recree
 * el aviso salvo que el admin vuelva a publicarlo allí expresamente.
 *
 * El orden de escritura es Product → Notification, igual que en las ventas,
 * para evitar interbloqueos cuando una venta y una resolución coinciden.
 */
export async function resolveMarketplaceRemovalNotification(
  tx: Prisma.TransactionClient,
  notificationId: string,
  userId?: string,
  resolvedAt = new Date(),
): Promise<ResolveMarketplaceNotificationResult> {
  const notification = await tx.marketplaceRemovalNotification.findUnique({
    where: { id: notificationId },
    select: { id: true, productId: true, marketplace: true, resolvedAt: true },
  });
  if (!notification) throw new Error("Notificación no encontrada.");
  if (notification.resolvedAt) {
    return { resolved: false, productId: notification.productId };
  }

  let productUnmarked = false;
  const config = MARKETPLACE_FLAGS.find(
    (candidate) => candidate.marketplace === notification.marketplace,
  );
  if (notification.productId && config) {
    const product = await tx.product.updateMany({
      where: { id: notification.productId, [config.productFlag]: true },
      data: { [config.productFlag]: false },
    });
    productUnmarked = product.count > 0;
  }

  const updated = await tx.marketplaceRemovalNotification.updateMany({
    where: { id: notification.id, resolvedAt: null },
    data: { resolvedAt },
  });

  if (updated.count > 0 && productUnmarked && notification.productId && config) {
    await tx.productAudit.create({
      data: {
        productId: notification.productId,
        userId,
        action: "marketplace_removed",
        changes: {
          [config.productFlag]: { from: true, to: false },
        } as Prisma.InputJsonValue,
      },
    });
  }

  return { resolved: updated.count > 0, productId: notification.productId };
}
