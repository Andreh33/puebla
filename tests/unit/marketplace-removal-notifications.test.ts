import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  recordMarketplaceRemovalNotifications,
  resolveMarketplaceRemovalNotification,
} from "@/lib/marketplaces/removal-notifications";

const productFindMany = vi.fn();
const productUpdateMany = vi.fn();
const notificationFindUnique = vi.fn();
const notificationUpdateMany = vi.fn();
const notificationUpsert = vi.fn();
const auditCreate = vi.fn();

const tx = {
  product: {
    findMany: productFindMany,
    updateMany: productUpdateMany,
  },
  marketplaceRemovalNotification: {
    findUnique: notificationFindUnique,
    updateMany: notificationUpdateMany,
    upsert: notificationUpsert,
  },
  productAudit: { create: auditCreate },
};

beforeEach(() => {
  vi.clearAllMocks();
  productFindMany.mockResolvedValue([]);
  productUpdateMany.mockResolvedValue({ count: 0 });
  notificationFindUnique.mockResolvedValue(null);
  notificationUpdateMany.mockResolvedValue({ count: 0 });
  notificationUpsert.mockResolvedValue({ id: "n1" });
  auditCreate.mockResolvedValue({ id: "a1" });
});

describe("recordMarketplaceRemovalNotifications", () => {
  it("agrupa tallas del mismo producto y crea un único aviso Miravia", async () => {
    productFindMany.mockResolvedValue([
      {
        id: "p1",
        name: "Zapatilla Azul",
        sku: "ZA-1",
        isOnMiravia: true,
        isOnAmazon: false,
      },
    ]);
    const soldAt = new Date("2026-08-07T10:00:00.000Z");

    const count = await recordMarketplaceRemovalNotifications(tx as never, {
      orderId: "order-1",
      soldAt,
      items: [
        { productId: "p1", quantity: 1 },
        { productId: "p1", quantity: 2 },
        { productId: null, quantity: 4 },
      ],
    });

    expect(count).toBe(1);
    expect(productFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["p1"] },
        OR: [{ isOnMiravia: true }, { isOnAmazon: true }],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        isOnMiravia: true,
        isOnAmazon: true,
      },
    });
    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          productId: "p1",
          marketplace: "MIRAVIA",
          quantitySold: 3,
          saleCount: 1,
          lastOrderId: "order-1",
          firstSoldAt: soldAt,
        }),
      }),
    );
  });

  it("crea dos avisos si el producto está publicado en Miravia y Amazon", async () => {
    productFindMany.mockResolvedValue([
      {
        id: "p1",
        name: "Pala Pro",
        sku: "PALA-1",
        isOnMiravia: true,
        isOnAmazon: true,
      },
    ]);

    const count = await recordMarketplaceRemovalNotifications(tx as never, {
      orderId: "order-both",
      items: [{ productId: "p1", quantity: 1 }],
    });

    expect(count).toBe(2);
    expect(notificationUpsert).toHaveBeenCalledTimes(2);
    expect(notificationUpsert.mock.calls.map(([call]) => call.create.marketplace)).toEqual([
      "MIRAVIA",
      "AMAZON",
    ]);
  });

  it("acumula otra venta sobre el aviso activo con incrementos atómicos", async () => {
    productFindMany.mockResolvedValue([
      {
        id: "p1",
        name: "Balón",
        sku: null,
        isOnMiravia: true,
        isOnAmazon: false,
      },
    ]);

    await recordMarketplaceRemovalNotifications(tx as never, {
      orderId: "order-2",
      items: [{ productId: "p1", quantity: 2 }],
    });

    expect(notificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          quantitySold: { increment: 2 },
          saleCount: { increment: 1 },
          lastOrderId: "order-2",
          resolvedAt: null,
        }),
      }),
    );
  });

  it("reabre un ciclo resuelto y reinicia sus cantidades sin duplicar el aviso", async () => {
    productFindMany.mockResolvedValue([
      {
        id: "p1",
        name: "Camiseta",
        sku: "CAM-1",
        isOnMiravia: true,
        isOnAmazon: false,
      },
    ]);
    notificationUpdateMany.mockResolvedValue({ count: 1 });

    await recordMarketplaceRemovalNotifications(tx as never, {
      orderId: "order-3",
      items: [{ productId: "p1", quantity: 1 }],
    });

    expect(notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: "p1",
          marketplace: "MIRAVIA",
          resolvedAt: { not: null },
        }),
        data: expect.objectContaining({ quantitySold: 1, saleCount: 1, resolvedAt: null }),
      }),
    );
    expect(notificationUpsert).not.toHaveBeenCalled();
  });

  it("no escribe nada cuando ninguna línea corresponde a un producto", async () => {
    const count = await recordMarketplaceRemovalNotifications(tx as never, {
      orderId: "order-open",
      items: [{ productId: null, quantity: 1 }],
    });

    expect(count).toBe(0);
    expect(productFindMany).not.toHaveBeenCalled();
    expect(notificationUpsert).not.toHaveBeenCalled();
  });
});

describe("resolveMarketplaceRemovalNotification", () => {
  it("resuelve sin borrar, desmarca Miravia y deja auditoría", async () => {
    notificationFindUnique.mockResolvedValue({
      id: "n1",
      productId: "p1",
      marketplace: "MIRAVIA",
      resolvedAt: null,
    });
    productUpdateMany.mockResolvedValue({ count: 1 });
    notificationUpdateMany.mockResolvedValue({ count: 1 });
    const resolvedAt = new Date("2026-08-07T12:00:00.000Z");

    const result = await resolveMarketplaceRemovalNotification(
      tx as never,
      "n1",
      "admin-1",
      resolvedAt,
    );

    expect(result).toEqual({ resolved: true, productId: "p1" });
    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: "p1", isOnMiravia: true },
      data: { isOnMiravia: false },
    });
    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: { id: "n1", resolvedAt: null },
      data: { resolvedAt },
    });
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "p1",
          userId: "admin-1",
          action: "marketplace_removed",
        }),
      }),
    );
  });

  it("es idempotente si otro proceso ya había resuelto el aviso", async () => {
    notificationFindUnique.mockResolvedValue({
      id: "n1",
      productId: "p1",
      marketplace: "MIRAVIA",
      resolvedAt: new Date(),
    });

    const result = await resolveMarketplaceRemovalNotification(tx as never, "n1");

    expect(result).toEqual({ resolved: false, productId: "p1" });
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(notificationUpdateMany).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("al resolver Amazon desmarca solo Amazon y conserva Miravia", async () => {
    notificationFindUnique.mockResolvedValue({
      id: "n-amazon",
      productId: "p1",
      marketplace: "AMAZON",
      resolvedAt: null,
    });
    productUpdateMany.mockResolvedValue({ count: 1 });
    notificationUpdateMany.mockResolvedValue({ count: 1 });

    const result = await resolveMarketplaceRemovalNotification(tx as never, "n-amazon", "admin-1");

    expect(result).toEqual({ resolved: true, productId: "p1" });
    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: "p1", isOnAmazon: true },
      data: { isOnAmazon: false },
    });
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changes: { isOnAmazon: { from: true, to: false } },
        }),
      }),
    );
  });
});
