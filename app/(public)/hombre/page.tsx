import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Hombre — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.hombre.seoLead,
  path: "/hombre",
});

export default function HombrePage() {
  return <GenderLanding slug="hombre" />;
}
