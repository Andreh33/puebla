import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { PwaInstallPrompt } from "@/components/public/PwaInstallPrompt";
import { PageLoader } from "@/components/public/PageLoader";
import { DotsBackground } from "@/components/public/DotsBackground";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DotsBackground />
      <PageLoader />
      <Header />
      <main id="main" className="min-h-[60vh] pt-[136px] sm:pt-[148px]">
        {children}
      </main>
      <Footer />
      <WhatsAppButton variant="floating" />
      <PwaInstallPrompt />
    </>
  );
}
