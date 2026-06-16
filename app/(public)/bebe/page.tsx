import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Bebé — Ropa, calzado y equipación deportiva",
  description: GENDER_LANDINGS.bebe.seoLead,
  path: "/bebe",
});

export default function BebePage() {
  return <GenderLanding slug="bebe" />;
}
