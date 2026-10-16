// @vitest-environment happy-dom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductShare } from "@/components/public/ProductShare";

const url = "https://zonasport.vercel.app/producto/zapatilla-joma";
const title = "Zapatilla Joma azul & blanca";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(share?: ReturnType<typeof vi.fn>, writeText = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal("navigator", { clipboard: { writeText }, ...(share ? { share } : {}) });
  render(<ProductShare title={title} url={url} />);
  return { writeText };
}

describe("Compartir productos", () => {
  it("prepara WhatsApp con el nombre y la URL del producto, sin destinatario", () => {
    setup();
    const href = screen
      .getByRole("link", { name: "Compartir producto por WhatsApp" })
      .getAttribute("href")!;
    const link = new URL(href);
    expect(link.origin + link.pathname).toBe("https://wa.me/");
    expect(link.searchParams.get("text")).toBe(`${title}\n${url}`);
  });

  it("copia el enlace y confirma la acción", async () => {
    const { writeText } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Enlace copiado"));
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it("usa el selector nativo al compartir cuando está disponible", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const { writeText } = setup(share);
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title, url }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copia como alternativa cuando no hay selector nativo", async () => {
    const { writeText } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
  });

  it("cancelar el selector no copia ni muestra un error", async () => {
    const error = new Error("Cancelado");
    error.name = "AbortError";
    const { writeText } = setup(vi.fn().mockRejectedValue(error));
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Compartir" }).hasAttribute("disabled")).toBe(
        false,
      ),
    );
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("ofrece copiar si el selector nativo falla", async () => {
    const { writeText } = setup(vi.fn().mockRejectedValue(new Error("Unavailable")));
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
  });

  it("permite copiar manualmente cuando el portapapeles está bloqueado", async () => {
    setup(undefined, vi.fn().mockRejectedValue(new Error("Denied")));
    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));
    const input = await screen.findByRole("textbox", { name: "Enlace del producto" });
    expect((input as HTMLInputElement).value).toBe(url);
    expect(input.hasAttribute("readonly")).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Selecciona y copia");
  });
});
