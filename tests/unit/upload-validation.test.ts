import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  validateTableFile,
  issuesToUploadError,
} from "@/lib/admin/upload-validation";

const MB = 1024 * 1024;
const f = (name: string, type: string, size: number) => ({ name, type, size });

describe("validateImageFile", () => {
  it("acepta un JPEG normal", () => {
    expect(validateImageFile(f("foto.jpg", "image/jpeg", 2 * MB))).toBeNull();
  });

  it("rechaza un PDF con código 'type'", () => {
    const issue = validateImageFile(f("catalogo.pdf", "application/pdf", 1 * MB));
    expect(issue?.code).toBe("type");
    expect(issue?.message).toContain("catalogo.pdf");
  });

  it("rechaza una imagen de más de 10 MB con código 'size'", () => {
    const issue = validateImageFile(f("grande.png", "image/png", 11 * MB));
    expect(issue?.code).toBe("size");
  });

  it("rechaza un archivo vacío con código 'empty'", () => {
    expect(validateImageFile(f("vacia.jpg", "image/jpeg", 0))?.code).toBe("empty");
  });

  it("acepta por extensión cuando el navegador no da tipo (.png)", () => {
    expect(validateImageFile(f("foto.png", "", 1 * MB))).toBeNull();
  });

  it("rechaza por extensión no-imagen cuando no hay tipo (.pdf)", () => {
    expect(validateImageFile(f("doc.pdf", "", 1 * MB))?.code).toBe("type");
  });

  it("NO bloquea HEIC de iPhone (se deja pasar para la ruta de compresión iOS)", () => {
    expect(validateImageFile(f("IMG_2026.heic", "image/heic", 3 * MB))).toBeNull();
  });

  it("acepta una imagen real con MIME genérico application/octet-stream (móviles)", () => {
    // Algunos navegadores/galerías de Android etiquetan las fotos como
    // octet-stream. El servidor las acepta (valida por magic bytes), así que el
    // cliente NO debe bloquearlas si la extensión es de imagen.
    expect(validateImageFile(f("foto.jpg", "application/octet-stream", 2 * MB))).toBeNull();
  });
});

describe("validateTableFile", () => {
  const exts = [".xlsx", ".xls", ".csv"];

  it("acepta un .xlsx", () => {
    expect(validateTableFile(f("catalogo.xlsx", "", 2 * MB), { exts })).toBeNull();
  });

  it("rechaza un .pdf con código 'type'", () => {
    expect(validateTableFile(f("catalogo.pdf", "", 2 * MB), { exts })?.code).toBe("type");
  });

  it("rechaza vacío y rechaza > tamaño máximo", () => {
    expect(validateTableFile(f("c.csv", "", 0), { exts })?.code).toBe("empty");
    expect(validateTableFile(f("c.csv", "", 21 * MB), { exts, maxSizeMB: 20 })?.code).toBe("size");
  });
});

describe("issuesToUploadError", () => {
  it("devuelve null sin problemas", () => {
    expect(issuesToUploadError([])).toBeNull();
  });

  it("con un problema usa su título y una entrada", () => {
    const issue = validateImageFile(f("x.pdf", "application/pdf", 1 * MB))!;
    const err = issuesToUploadError([issue]);
    expect(err?.title).toBe(issue.title);
    expect(err?.issues).toHaveLength(1);
  });

  it("con varios problemas el título lleva el conteo", () => {
    const a = validateImageFile(f("a.pdf", "application/pdf", 1 * MB))!;
    const b = validateImageFile(f("b.jpg", "image/jpeg", 0))!;
    const err = issuesToUploadError([a, b], "Pista");
    expect(err?.title).toContain("2");
    expect(err?.issues).toHaveLength(2);
    expect(err?.hint).toBe("Pista");
  });
});
