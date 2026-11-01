import { notFound } from "next/navigation";
import { isLocalePublished } from "@/lib/i18n/readiness";
import { GoogleReviews } from "@/components/public/GoogleReviews";
import { normalizeLocale } from "@/lib/i18n/config";
import { setRequestLocale } from "@/lib/i18n/request";
import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import { PageLoader } from "@/components/public/PageLoader";
// import { DotsBackground } from "@/components/public/DotsBackground"; // reemplazado por AuroraBackground (Bloque 7.5); se mantiene en disco por si rollback
import { AuroraBackground } from "@/components/public/AuroraBackground";
import { AppPromoBanner } from "@/components/public/AppPromoBanner";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = normalizeLocale((await params).locale);
  setRequestLocale(locale);
  if (!isLocalePublished(locale)) notFound();
  return (
    <>
      <AuroraBackground />
      <PageLoader />
      <Header />
      <main id="main" className="min-h-[60vh] pt-[var(--zs-header-offset)]">
        {tx(children)}
      </main>
      <GoogleReviews locale={locale} compact />
      <Footer />
      <WhatsAppButton variant="floating" />
      <PwaInstallPrompt />
      <AppPromoBanner />
    </>
  );
}
