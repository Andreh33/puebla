import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

 const baseMetadata: Metadata = buildMetadata({
  title: "Mujer — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.mujer.seoLead,
  path: "/mujer",
});

  function MujerPage() {
  return <GenderLanding slug="mujer" />;
}

export default withLocalePage(MujerPage);
export const generateMetadata = withLocaleMetadata(baseMetadata);
