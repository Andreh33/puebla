import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { NinosLanding } from "@/components/public/NinosLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Niños — Niño, niña y accesorios deportivos",
  description:
    "Tres secciones — niño, niña y accesorios. Calzado, ropa deportiva y outdoor para que crezcan moviéndose. John Smith, +8000, Joma y más en Zona Sport.",
  path: "/ninos",
});

export default function NinosPage() {
  return (
    <>
      {/* Anula el padding-top del <main> público para que la foto del hero
          quede DETRÁS de la pill flotante del Header (mismo truco que el home
          y que /mujer y /hombre). */}
      <div className="-mt-[136px] sm:-mt-[148px]" />
      <NinosLanding />
    </>
  );
}
