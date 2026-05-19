import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { jsonLd, breadcrumbSchema } from "@/lib/seo/schema-org";

/**
 * NinosLanding — landing exclusiva de /ninos.
 *
 * A diferencia de `GenderLanding` (que sirve para /mujer, /hombre y /ninos
 * de forma genérica), aquí el cliente pidió tres secciones diferenciadas
 * apiladas verticalmente: NIÑO, NIÑA y ACCESORIOS, cada una con su propio
 * título y 4 tiles internos.
 *
 * Patrón visual de los tiles: replica el bloque "Por tipo de prenda" de
 * GenderLanding — gradient brand + numeral grande decorativo + título + sub
 * copy + flecha. Sin fotos en los tiles para evitar logos prohibidos y
 * mantener una estética editorial coherente.
 *
 * Colores por bloque:
 *   - NIÑO:        azul navy (zs-blue)
 *   - NIÑA:        rosa-rojo (zs-red)
 *   - ACCESORIOS:  verde tennis (emerald)
 *
 * Es 100% Server Component porque solo tiene presentación y no necesita
 * estado del cliente (a diferencia de `GenderHero` que sí tiene animaciones
 * con `useState`). Reutilizamos `GenderHero` para mantener consistencia con
 * /mujer y /hombre y aprovechar la foto top.
 */

import { GenderHero } from "@/components/public/GenderHero";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

type Tile = {
  /** Numeral decorativo "01" .. "04". */
  numeral: string;
  /** Título visible en el tile. */
  name: string;
  /** Sub-copy breve. */
  copy: string;
  /** Destino (href completo). */
  href: string;
};

type Block = {
  /** ID para anclas / aria. */
  id: string;
  /** Eyebrow corto encima del título. */
  eyebrow: string;
  /** Título grande del bloque (font-display). */
  title: string;
  /** Sub-copy bajo el título. */
  subtitle: string;
  /** Clase Tailwind para el gradient de los tiles del bloque. */
  accent: string;
  /** Tiles del bloque (4). */
  tiles: Tile[];
};

const BLOCKS: Block[] = [
  {
    id: "nino",
    eyebrow: "Para ellos",
    title: "Niño",
    subtitle: "Calzado y ropa pensada para crecer corriendo.",
    accent: "from-zs-blue-700 to-zs-blue-950",
    tiles: [
      {
        numeral: "01",
        name: "Camisetas",
        copy: "Manga corta, larga y polos",
        href: "/camisetas?genero=NINO",
      },
      {
        numeral: "02",
        name: "Pantalones",
        copy: "Chándales, shorts y bermudas",
        href: "/pantalones?genero=NINO",
      },
      {
        numeral: "03",
        name: "Sudaderas",
        copy: "Con capucha, forros y abrigos",
        href: "/sudaderas?genero=NINO",
      },
      {
        numeral: "04",
        name: "Calzado niño",
        copy: "Deporte, casual y outdoor",
        href: "/calzado?genero=NINO",
      },
    ],
  },
  {
    id: "nina",
    eyebrow: "Para ellas",
    title: "Niña",
    subtitle: "Comodidad y diseño para que vivan el deporte a su ritmo.",
    accent: "from-zs-red-600 to-zs-red-800",
    tiles: [
      {
        numeral: "01",
        name: "Camisetas",
        copy: "Manga corta, larga y técnicas",
        href: "/camisetas?genero=NINA",
      },
      {
        numeral: "02",
        name: "Mallas",
        copy: "Largas, piratas y shorts",
        href: "/pantalones?genero=NINA",
      },
      {
        numeral: "03",
        name: "Vestidos",
        copy: "Deportivos y de tenis",
        href: "/vestidos?genero=NINA",
      },
      {
        numeral: "04",
        name: "Calzado niña",
        copy: "Deporte, casual y outdoor",
        href: "/calzado?genero=NINA",
      },
    ],
  },
  {
    id: "accesorios",
    eyebrow: "Para acompañar",
    title: "Accesorios",
    subtitle: "Lo que completa el equipo, sin distinción de género.",
    accent: "from-emerald-700 to-emerald-950",
    tiles: [
      {
        numeral: "01",
        name: "Mochilas",
        copy: "Para cole, gym o entreno",
        href: "/accesorios",
      },
      {
        numeral: "02",
        name: "Calcetines",
        copy: "Técnicos, deporte y casual",
        href: "/calcetines",
      },
      {
        numeral: "03",
        name: "Gorras",
        copy: "Sol, running y running trail",
        href: "/gorras",
      },
      {
        numeral: "04",
        name: "Balones",
        copy: "Fútbol, baloncesto y más",
        href: "/balones",
      },
    ],
  },
];

const breadcrumbs = [
  { name: "Inicio", path: "/" },
  { name: "Niños", path: "/ninos" },
];

const SEO_LEAD =
  "Selección Zona Sport para niños y niñas: tres secciones — niño, niña y accesorios. Calzado, ropa deportiva y outdoor de John Smith, +8000, Joma y más. Asesoramos la talla en tienda sin compromiso.";

const collectionLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Niños — Zona Sport",
  description: SEO_LEAD,
  url: `${SITE_URL}/ninos`,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  inLanguage: "es-ES",
};

export function NinosLanding() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(collectionLd) }}
      />

      {/* HERO foto-top — misma foto que ya existe (`/category-photos/ninos-landing.jpg`)
          y mismo patrón visual que /mujer y /hombre. */}
      <GenderHero gender="ninos" />

      {/* Breadcrumbs */}
      <nav aria-label="Migas de pan" className="border-b border-zs-border bg-white">
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-3 text-xs text-zs-muted">
          {breadcrumbs.map((b, i) => (
            <li key={b.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-zs-ink" aria-current="page">
                  {b.name}
                </span>
              ) : (
                <Link href={b.path} className="hover:text-zs-blue-700">
                  {b.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Intro editorial — pequeña tira blanca de bienvenida bajo el hero
          que sustituye al bloque de "producto destacado" del GenderLanding
          genérico. Aquí explicamos el porqué de las TRES secciones. */}
      <section className="border-b border-zs-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zs-red-600">
            Tres secciones, un objetivo
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-2xl font-extrabold leading-tight tracking-tight text-zs-blue-900 sm:text-3xl">
            Que cada peque encuentre lo suyo sin perder tiempo.
          </h2>
        </div>
      </section>

      {/* TRES BLOQUES apilados verticalmente. Cada bloque alterna fondo
          (blanco / surface) para que el ojo separe visualmente las
          secciones sin necesidad de bordes gruesos. */}
      {BLOCKS.map((block, blockIndex) => {
        const oddBg = blockIndex % 2 === 1;
        return (
          <section
            key={block.id}
            id={block.id}
            aria-labelledby={`block-${block.id}-title`}
            className={
              oddBg
                ? "border-b border-zs-border bg-zs-surface"
                : "border-b border-zs-border bg-white"
            }
          >
            <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
              {/* Divider + título del bloque */}
              <div className="mb-10 flex flex-col items-start gap-3 sm:mb-12">
                <span aria-hidden className="block h-px w-16 bg-zs-red-600" />
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-zs-red-600">
                  {block.eyebrow}
                </p>
                <h2
                  id={`block-${block.id}-title`}
                  className="font-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] text-zs-blue-900 sm:text-5xl lg:text-6xl"
                >
                  {block.title}
                </h2>
                <p className="max-w-2xl text-base text-zs-muted sm:text-lg">
                  {block.subtitle}
                </p>
              </div>

              {/* Tiles del bloque */}
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {block.tiles.map((tile) => (
                  <li key={`${block.id}-${tile.numeral}`}>
                    <Link
                      href={tile.href}
                      className={`group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${block.accent} p-5 text-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl sm:p-6`}
                    >
                      <span
                        aria-hidden
                        className="absolute right-4 top-4 font-display text-3xl font-extrabold tracking-tight text-white/20 sm:text-4xl"
                      >
                        {tile.numeral}
                      </span>
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent"
                      />
                      <div className="relative">
                        <h3 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                          {tile.name}
                        </h3>
                        <p className="mt-1 text-sm text-white/85">{tile.copy}</p>
                        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                          Ver {tile.name.toLowerCase()}{" "}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </>
  );
}
