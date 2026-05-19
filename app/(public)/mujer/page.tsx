import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Mujer — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.mujer.seoLead,
  path: "/mujer",
});

export default function MujerPage() {
  return <GenderLanding slug="mujer" />;
}
