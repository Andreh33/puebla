import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  reservationCreate: vi.fn(),
  recordNotifications: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { $transaction: mocks.transaction },
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/marketplaces/removal-notifications", () => ({
  recordMarketplaceRemovalNotifications: mocks.recordNotifications,
}));

import { POST } from "@/app/api/reservations/route";

const transactionClient = {
  whatsappReservation: { create: mocks.reservationCreate },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reservationCreate.mockResolvedValue({ id: "reservation-1" });
  mocks.recordNotifications.mockResolvedValue(2);
  mocks.transaction.mockImplementation(
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
});

describe("POST /api/reservations", () => {
  it("registra la reserva y sus avisos de marketplace en la misma transacción", async () => {
    const request = new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "cart",
        itemsCount: 3,
        amount: 74.5,
        summary: "Reserva de carrito",
        items: [
          { productId: " product-1 ", quantity: 2 },
          { productId: "product-2", quantity: 1 },
          { productId: "product-invalid", quantity: 0 },
        ],
      }),
    });

    const response = await POST(request as NextRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.reservationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "cart",
          itemsCount: 3,
          amount: "74.50",
          summary: "Reserva de carrito",
        }),
        select: { id: true },
      }),
    );
    expect(mocks.recordNotifications).toHaveBeenCalledWith(transactionClient, {
      reservationId: "reservation-1",
      items: [
        { productId: "product-1", quantity: 2 },
        { productId: "product-2", quantity: 1 },
      ],
    });
  });
});
