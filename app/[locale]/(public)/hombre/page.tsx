import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

 const baseMetadata: Metadata = buildMetadata({
  title: "Hombre — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.hombre.seoLead,
  path: "/hombre",
});

  function HombrePage() {
  return <GenderLanding slug="hombre" />;
}

export default withLocalePage(HombrePage);
export const generateMetadata = withLocaleMetadata(baseMetadata);
