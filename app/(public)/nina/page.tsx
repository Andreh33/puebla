import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Niña — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.nina.seoLead,
  path: "/nina",
});

export default function NinaPage() {
  return <GenderLanding slug="nina" />;
}
