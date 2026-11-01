"use client";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_INFO } from "@/lib/i18n/config";
import { languageSwitchPath } from "@/lib/i18n/routing";
import { useLocale, useAvailableLocales } from "./LocaleProvider";
import { ChevronDown } from "lucide-react";
export function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();
  const availableLocales = useAvailableLocales();
  if (availableLocales.length < 2) return null;
  return (
    <span className="relative inline-flex h-11 w-[60px] shrink-0 items-center justify-center gap-1 rounded-full bg-black/[0.04] text-xs font-semibold text-zs-ink transition-colors hover:bg-black/[0.07] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-zs-blue-700">
      <span aria-hidden="true">{locale.toUpperCase()}</span>
      <ChevronDown aria-hidden="true" className="h-3 w-3" />
      <select
      aria-label={LOCALE_INFO[locale].name}
      value={locale}
      onChange={(event) => {
        const target = LOCALES.find((item) => item === event.target.value);
        if (target) window.location.assign(languageSwitchPath(target, pathname));
      }}
      className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
    >
      {availableLocales.map((item) => (
        <option key={item} value={item}>
          {LOCALE_INFO[item].name}
        </option>
      ))}
      </select>
    </span>
  );
}
