"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
const LocaleContext = createContext<{
  locale: Locale;
  dictionary: Record<string, string>;
  availableLocales: readonly Locale[];
}>({
  locale: "es",
  dictionary: {},
  availableLocales: ["es"],
});
export function LocaleProvider({
  locale,
  dictionary,
  availableLocales = ["es"],
  children,
}: {
  locale: Locale;
  dictionary: Record<string, string>;
  availableLocales?: readonly Locale[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, dictionary, availableLocales }),
    [locale, dictionary, availableLocales],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
export function useTranslations(): (source: string) => string {
  const { locale, dictionary } = useContext(LocaleContext);
  return (source) => {
    if (locale === "es" || !source.trim()) return source;
    const result = dictionary[source.trim()];
    if (!result) throw new Error(`Missing ${locale} UI translation: ${source.trim()}`);
    return result;
  };
}

export function useTranslatedValue(): <T>(value: T) => T {
  const { dictionary } = useContext(LocaleContext);
  return <T,>(value: T): T =>
    typeof value === "string" ? ((dictionary[value.trim()] ?? value) as T) : value;
}
export function useTranslatedTemplate() {
  const t = useTranslations();
  return (source: string, values: unknown[]) =>
    t(source).replace(/\{(\d+)\}/g, (_all, index) => String(values[Number(index)] ?? ""));
}

export function useAvailableLocales(): readonly Locale[] {
  return useContext(LocaleContext).availableLocales;
}
