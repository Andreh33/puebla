// @vitest-environment happy-dom

import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  resolve: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/app/admin/notificaciones/_actions", () => ({
  resolveMarketplaceNotificationAction: (...args: unknown[]) => mocks.resolve(...args),
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

import {
  NotificationsClient,
  type MarketplaceNotificationDTO,
} from "@/app/admin/notificaciones/NotificationsClient";

const notification: MarketplaceNotificationDTO = {
  id: "notification-1",
  marketplace: "MIRAVIA",
  productId: "product-1",
  productName: "Zapatilla Azul",
  productSku: "ZA-1",
  quantitySold: 2,
  saleCount: 1,
  lastOrderId: "order-1",
  firstSoldAt: "2026-08-07T10:00:00.000Z",
  lastSoldAt: "2026-08-07T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolve.mockResolvedValue({ ok: true });
});

afterEach(cleanup);

describe("NotificationsClient", () => {
  it("muestra el aviso persistente con producto, marketplace y venta", () => {
    render(<NotificationsClient notifications={[notification]} totalCount={1} />);

    expect(screen.getByText("Zapatilla Azul")).toBeTruthy();
    expect(screen.getByText("Miravia")).toBeTruthy();
    expect(screen.getByText("SKU: ZA-1")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ya está retirado/i })).toBeTruthy();
  });

  it("identifica correctamente los avisos de Amazon", () => {
    render(
      <NotificationsClient
        notifications={[{ ...notification, id: "notification-amazon", marketplace: "AMAZON" }]}
        totalCount={1}
      />,
    );

    expect(screen.getByText("Amazon")).toBeTruthy();
  });

  it("no retira el aviso sin confirmación y lo quita solo tras resolverlo", async () => {
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    render(<NotificationsClient notifications={[notification]} totalCount={1} />);

    fireEvent.click(screen.getByRole("button", { name: /Ya está retirado/i }));
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(screen.getByText("Zapatilla Azul")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Ya está retirado/i }));
    await waitFor(() => expect(mocks.resolve).toHaveBeenCalledWith("notification-1"));
    await waitFor(() => expect(screen.getByText("Todo al día")).toBeTruthy());
    expect(mocks.refresh).toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("no confunde un fallo de base de datos con una bandeja vacía", () => {
    render(<NotificationsClient notifications={[]} totalCount={0} loadError />);

    expect(screen.getByText("No se pudieron cargar los avisos")).toBeTruthy();
    expect(screen.queryByText("Todo al día")).toBeNull();
  });
});
