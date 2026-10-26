import { createHash } from "node:crypto";
import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Locale } from "./config";
import { getRequestLocale } from "./request";
export type UiDictionary = Record<string, string>;
const dictionaries = new Map<Locale, UiDictionary>();
export function getDictionary(locale: Locale): UiDictionary {
  if (locale === "es") return {};
  if (dictionaries.has(locale)) return dictionaries.get(locale)!;
  let dictionary: UiDictionary = {};
  try {
    dictionary = JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "translations", locale, "ui.json"), "utf8"),
    );
  } catch {
    /* absence is tracked by readiness */
  }
  dictionaries.set(locale, dictionary);
  return dictionary;
}
export function hasCompleteUi(locale: Locale): boolean {
  if (locale === "es") return true;
  try {
    const source: Record<string, unknown> = JSON.parse(
      readFileSync(path.join(process.cwd(), "evidence", "ui-source.es.json"), "utf8"),
    );
    const dictionary = getDictionary(locale);
    return (
      Object.keys(source).length > 0 &&
      Object.keys(source).every(
        (key) => typeof dictionary[key] === "string" && dictionary[key]!.trim(),
      )
    );
  } catch {
    return false;
  }
}
export function translate(locale: Locale, source: string): string {
  if (locale === "es" || !source.trim()) return source;
  const result = getDictionary(locale)[source.trim()];
  if (typeof result !== "string" || !result.trim())
    throw new Error(`Missing ${locale} UI translation: ${source.trim()}`);
  return result;
}
export function t(source: string): string {
  return translate(getRequestLocale(), source);
}

export function translateValue<T>(value: T): T {
  if (typeof value !== "string") return value;
  return (getDictionary(getRequestLocale())[value.trim()] ?? value) as T;
}
export function translateTemplate(source: string, values: unknown[]): string {
  return t(source).replace(/\{(\d+)\}/g, (_all, index) => String(values[Number(index)] ?? ""));
}

const clientDictionaries = new Map<Locale, UiDictionary>();
export function getClientDictionary(locale: Locale): UiDictionary {
  if (locale === "es") return {};
  if (clientDictionaries.has(locale)) return clientDictionaries.get(locale)!;
  const full = getDictionary(locale);
  let result = full;
  try {
    const corpus = readFileSync(path.join(process.cwd(), "evidence", "ui-source.es.json"), "utf8");
    const manifest = JSON.parse(
      readFileSync(path.join(process.cwd(), "evidence", "ui-client-keys.es.json"), "utf8"),
    ) as { sourceHash: string; keys: string[] };
    // A changed corpus falls back safely until the extraction command is rerun.
    if (manifest.sourceHash === createHash("sha256").update(corpus).digest("hex"))
      result = Object.fromEntries(
        manifest.keys.filter((key) => key in full).map((key) => [key, full[key]!]),
      );
  } catch {
    /* safe full-dictionary fallback; no catalog content is included */
  }
  clientDictionaries.set(locale, result);
  return result;
}
