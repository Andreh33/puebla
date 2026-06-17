import { describe, it, expect } from "vitest";
import {
  generateCoverSvg,
  escapeXml,
  wrapTitle,
} from "@/lib/blog/cover-svg";

describe("generateCoverSvg", () => {
  it("produce un SVG válido con cabecera y viewBox 1200x630", () => {
    const svg = generateCoverSvg({ title: "Cómo elegir tu pala de pádel" });
    expect(svg.trimStart().startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("viewBox=\"0 0 1200 630\"");
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("incluye el título escapado en el contenido", () => {
    const svg = generateCoverSvg({ title: "Running & pádel" });
    // El título aparece como aria-label escapado.
    expect(svg).toContain("Running &amp; pádel");
    // No debe quedar el '&' sin escapar dentro del documento.
    expect(svg).not.toContain("Running & pádel");
  });

  it("aplica el acento y el kicker proporcionados", () => {
    const svg = generateCoverSvg({
      title: "Botas de fútbol",
      accent: "#22c55e",
      kicker: "Zona Sport · Fútbol",
    });
    expect(svg).toContain("#22c55e");
    expect(svg.toUpperCase()).toContain("ZONA SPORT · FÚTBOL");
  });

  it("usa el acento de marca por defecto si no se indica", () => {
    const svg = generateCoverSvg({ title: "Sin acento" });
    expect(svg).toContain("#c8da46");
  });

  it("escapa caracteres XML peligrosos en títulos con comillas y signos", () => {
    const svg = generateCoverSvg({ title: `Lo "mejor" <para> ti & los demás` });
    expect(svg).toContain("&quot;");
    expect(svg).toContain("&lt;");
    expect(svg).toContain("&gt;");
    expect(svg).toContain("&amp;");
    // No debe romper el SVG: sigue empezando y acabando bien.
    expect(svg.trimStart().startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("maneja títulos largos sin desbordar (máximo 3 líneas de título)", () => {
    const long =
      "Guía definitiva para elegir las mejores zapatillas de running según tu pisada peso y kilómetros";
    const svg = generateCoverSvg({ title: long });
    // Cuenta los <text> de título (los que tienen font-weight 900).
    const titleLines = (svg.match(/font-weight="900"/g) || []).length;
    expect(titleLines).toBeLessThanOrEqual(3);
    expect(titleLines).toBeGreaterThanOrEqual(1);
  });
});

describe("escapeXml", () => {
  it("escapa los cinco caracteres reservados", () => {
    expect(escapeXml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &apos;");
  });

  it("deja intacto el texto sin caracteres especiales", () => {
    expect(escapeXml("Pádel y running")).toBe("Pádel y running");
  });
});

describe("wrapTitle", () => {
  it("no parte palabras y respeta el máximo de líneas", () => {
    const lines = wrapTitle("Cómo elegir la pala de pádel según tu nivel");
    expect(lines.length).toBeLessThanOrEqual(3);
    // Reunidas, conservan todas las palabras originales (salvo elipsis).
    expect(lines.join(" ")).toContain("Cómo elegir");
  });

  it("recorta con elipsis cuando una sola palabra/línea es enorme", () => {
    const lines = wrapTitle("Superlargapalabraquenocabeenningunalineaposible");
    const last = lines[lines.length - 1] ?? "";
    expect(last.endsWith("…")).toBe(true);
  });

  it("devuelve una línea vacía para entrada vacía", () => {
    expect(wrapTitle("")).toEqual([""]);
  });
});
