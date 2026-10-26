"use client";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_INFO } from "@/lib/i18n/config";
import { languageSwitchPath } from "@/lib/i18n/routing";
import { useLocale, useAvailableLocales } from "./LocaleProvider";
export function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();
  const availableLocales = useAvailableLocales();
  if (availableLocales.length < 2) return null;
  return (
    <select
      aria-label={LOCALE_INFO[locale].name}
      value={locale}
      onChange={(event) => {
        const target = LOCALES.find((item) => item === event.target.value);
        if (target) window.location.assign(languageSwitchPath(target, pathname));
      }}
      className="border-zs-border text-zs-ink max-w-[105px] rounded-lg border bg-white px-2 py-1 text-xs"
    >
      {availableLocales.map((item) => (
        <option key={item} value={item}>
          {LOCALE_INFO[item].name}
        </option>
      ))}
    </select>
  );
}
