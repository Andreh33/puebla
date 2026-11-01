import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

 const baseMetadata: Metadata = buildMetadata({
  title: "Niño — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.nino.seoLead,
  path: "/nino",
});

  function NinoPage() {
  return <GenderLanding slug="nino" />;
}

export default withLocalePage(NinoPage);
export const generateMetadata = withLocaleMetadata(baseMetadata);
