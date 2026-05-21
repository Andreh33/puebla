import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import { PageLoader } from "@/components/public/PageLoader";
// import { DotsBackground } from "@/components/public/DotsBackground"; // reemplazado por AuroraBackground (Bloque 7.5); se mantiene en disco por si rollback
import { AuroraBackground } from "@/components/public/AuroraBackground";
import { AppPromoBanner } from "@/components/public/AppPromoBanner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuroraBackground />
      <PageLoader />
      <Header />
      <main id="main" className="min-h-[60vh] pt-[136px] sm:pt-[148px]">
        {children}
      </main>
      <Footer />
      <WhatsAppButton variant="floating" />
      <PwaInstallPrompt />
      <AppPromoBanner />
    </>
  );
}
