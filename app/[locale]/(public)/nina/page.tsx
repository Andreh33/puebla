import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

 const baseMetadata: Metadata = buildMetadata({
  title: "Niña — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.nina.seoLead,
  path: "/nina",
});

  function NinaPage() {
  return <GenderLanding slug="nina" />;
}

export default withLocalePage(NinaPage);
export const generateMetadata = withLocaleMetadata(baseMetadata);
