import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Niño — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.nino.seoLead,
  path: "/nino",
});

export default function NinoPage() {
  return <GenderLanding slug="nino" />;
}
