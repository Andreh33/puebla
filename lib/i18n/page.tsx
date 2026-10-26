import { isLocalePublished } from "@/lib/i18n/readiness";
import "server-only";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isLocale, LOCALE_INFO, type Locale } from "./config";
import { localePath } from "./routing";
import { setRequestLocale } from "./request";
import { getDictionary, hasCompleteUi } from "./dictionaries";

type LocaleProps = { params?: Promise<{ locale?: string }> };
async function entryLocale(props: LocaleProps): Promise<Locale> {
  const locale = (await props.params)?.locale ?? "es";
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
export function withLocalePage<P>(render: (props: P) => ReactNode | Promise<ReactNode>) {
  return async function LocalizedPage(props: P & LocaleProps) {
    const locale = await entryLocale(props);
    if (!isLocalePublished(locale)) notFound();
    return render(props);
  };
}
export function withLocaleMetadata<P>(
  metadata: Metadata | ((props: P) => Metadata | Promise<Metadata>),
) {
  return async function localizedMetadata(props: P & LocaleProps): Promise<Metadata> {
    const locale = await entryLocale(props);
    const ready = isLocalePublished(locale);
    if (!ready) return { title: "Zona Sport", robots: { index: false, follow: false } };
    const original = typeof metadata === "function" ? await metadata(props) : metadata;
    const dictionary = getDictionary(locale);
    const translate = (value: unknown): unknown => {
      if (typeof value !== "string") return value;
      if (dictionary[value.trim()]) return dictionary[value.trim()];
      const suffix = value.match(/^(.*?)( \| Zona Sport.*)$/);
      return suffix && dictionary[suffix[1]!] ? `${dictionary[suffix[1]!]}${suffix[2]}` : value;
    };
    const canonical = original.alternates?.canonical;
    let canonicalUrl: string | undefined;
    if (canonical) {
      const url = new URL(String(canonical));
      url.pathname = localePath(locale, url.pathname);
      canonicalUrl = url.toString();
    }
    return {
      ...original,
      title: ready ? (translate(original.title) as Metadata["title"]) : "Zona Sport",
      description: ready ? (translate(original.description) as string | undefined) : undefined,
      alternates: { ...original.alternates, ...(canonicalUrl ? { canonical: canonicalUrl } : {}) },
      openGraph: {
        ...original.openGraph,
        locale: LOCALE_INFO[locale].og,
        ...(canonicalUrl ? { url: canonicalUrl } : {}),
        title: ready ? (translate(original.openGraph?.title) as string) : "Zona Sport",
        description: ready ? (translate(original.openGraph?.description) as string) : undefined,
      },
      ...(!ready ? { robots: { index: false, follow: false } } : {}),
    };
  };
}
