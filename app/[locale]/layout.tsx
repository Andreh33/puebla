import { isLocalePublished } from "@/lib/i18n/readiness";
import { notFound } from "next/navigation";
import RootDocument from "@/lib/i18n/root-document";
import { isLocale, LOCALES, LOCALE_INFO } from "@/lib/i18n/config";
import { setRequestLocale } from "@/lib/i18n/request";
import { buildMetadata } from "@/lib/seo/metadata";
export { viewport } from "@/lib/i18n/root-document";
export function generateStaticParams() {
  return LOCALES.filter(isLocalePublished).map((locale) => ({ locale }));
}
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return buildMetadata({ title: LOCALE_INFO[locale].homeTitle, path: "/", locale });
}
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  if (!isLocalePublished(locale)) notFound();
  return RootDocument({ children, locale });
}
