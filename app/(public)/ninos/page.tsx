import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { GenderLanding, GENDER_LANDINGS } from "@/components/public/GenderLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Niños — Ropa y calzado deportivo infantil",
  description: GENDER_LANDINGS.ninos.seoLead,
  path: "/ninos",
});

export default function NinosPage() {
  return <GenderLanding slug="ninos" />;
}
