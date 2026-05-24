import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  HeartHandshake,
  Sparkles,
  ShieldCheck,
  Users,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  STORE_NAP,
  breadcrumbSchema,
  jsonLd,
  localBusinessSchema,
} from "@/lib/seo/schema-org";
import { whatsappUrl, WhatsAppMessages, telHref } from "@/lib/whatsapp";

export const metadata: Metadata = buildMetadata({
  title: "Sobre nosotros",
  description:
    "Conoce Zona Sport: tienda multimarca de deportes en Puebla de la Calzada con años equipando a deportistas de las Vegas Bajas del Guadiana. Trato cercano y consejo experto.",
  path: "/sobre-nosotros",
});

const VALUES = [
  {
    icon: HeartHandshake,
    title: "Trato cercano",
    description:
      "Te conocemos por tu nombre, recordamos tu talla y entendemos lo que buscas. Sin agobios y sin presión.",
  },
  {
    icon: Sparkles,
    title: "Selección cuidada",
    description:
      "Trabajamos solo las marcas técnicas que de verdad cumplen. Nada de relleno: cada modelo está aquí por algo.",
  },
  {
    icon: ShieldCheck,
    title: "Asesoramiento real",
    description:
      "Analizamos tu pisada, te dejamos probar el material y te aconsejamos lo que necesitas, aunque no sea lo más caro.",
  },
  {
    icon: Users,
    title: "Apoyo al deporte local",
    description:
      "Equipamos clubes, peñas y carreras populares de Puebla, Montijo y comarca. El deporte de base nos importa.",
  },
] as const;

const GALLERY = [
  {
    alt: "Bota alta de montaña — +8000 Tovir, marca outdoor que trabajamos",
    src: "/sample-products/bota-alta-8000-tovir-negro.webp",
    bg: "from-zs-blue-800 to-zs-blue-950",
  },
  {
    alt: "Anorak parka técnico +8000 Vezar para invierno en la sierra",
    src: "/sample-products/anorack-parka-8000-vezar-negro.webp",
    bg: "from-slate-700 to-slate-900",
  },
  {
    alt: "Zapatilla casual John Smith con corte limpio y suela técnica",
    src: "/sample-products/bota-alta-john-smith-libel-high-24i-blanco.webp",
    bg: "from-zs-blue-50 to-white",
  },
  {
    alt: "Anorak trekking +8000 Dinamic, capa media para Sierra Norte",
    src: "/sample-products/anorack-treking-8000-dinamic-24i-avellana.webp",
    bg: "from-amber-100 to-orange-200",
  },
  {
    alt: "Camiseta técnica de manga larga +8000 Erro mostaza",
    src: "/sample-products/camiseta-mlarga-8000-erro-24i-mostaza.webp",
    bg: "from-yellow-100 to-yellow-200",
  },
  {
    alt: "Anorak cazadora +8000 Colese para uso urbano outdoor",
    src: "/sample-products/anorack-cazadora-8000-colese-24i-avellana.webp",
    bg: "from-stone-200 to-stone-400",
  },
];

export default function SobreNosotrosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: "Inicio", path: "/" },
              { name: "Sobre nosotros", path: "/sobre-nosotros" },
            ]),
          ),
        }}
      />

      {/* Hero */}
      <section className="bg-zs-gradient py-14 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zs-tennis-300">
            Tienda multimarca en Puebla de la Calzada
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl md:text-5xl">
            Quiénes somos
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            Una tienda de barrio que lleva años vistiendo a deportistas de las Vegas Bajas del
            Guadiana. Cercanía, consejo experto y marcas que cumplen.
          </p>
        </div>
      </section>

      {/* Historia */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">Nuestra historia</h2>
        <div className="prose prose-zs mt-6 max-w-none text-zs-ink/90">
          <p>
            Zona Sport nació en Puebla de la Calzada con una idea muy sencilla: ser la tienda
            de deportes a la que tú mismo querrías ir. La que está a cinco minutos andando, la
            que te conoce por el nombre, la que no te suelta el rollo comercial cuando entras
            y la que te dice de verdad si una zapatilla te conviene o no, aunque eso signifique
            recomendarte una más barata.
          </p>
          <p>
            Llevamos años acompañando a los deportistas de las Vegas Bajas del Guadiana:
            corredores que entrenan junto al Guadiana, jugadores de pádel del Club Puebla,
            equipos del CD Puebla de la Calzada y del CD Lobón, familias buscando el equipo
            del colegio, senderistas de la Sierra de San Serván, padres de los chavales que
            empiezan a jugar al fútbol. Sabemos que el deporte se vive con pasión y que el
            material importa — por eso seleccionamos marcas técnicas (John Smith, +8000,
            Joma, Puma, Babolat, Joluvi, Ditchil, Shayber) y no apostamos por lo barato
            sin más.
          </p>
          <p>
            Somos multimarca y somos independientes. Eso significa que cuando entras a Zona
            Sport, el consejo que recibes no responde a una cuota de marca: responde a lo que
            de verdad pensamos que es mejor para ti. Nos podrás encontrar siempre en el mismo
            sitio, la C. Silos 3, a dos pasos de la Plaza de España. Y si no puedes pasarte,
            estamos al otro lado del WhatsApp.
          </p>
        </div>
      </section>

      {/* Valores */}
      <section className="border-y border-zs-border bg-zs-surface/60 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">
            Lo que nos mueve
          </h2>
          <p className="mt-2 max-w-2xl text-zs-muted">
            Cuatro principios que aplicamos cada día detrás del mostrador.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-zs-border bg-white p-6 shadow-sm"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zs-blue-50 text-zs-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zs-blue-900">{title}</h3>
                <p className="mt-2 text-sm text-zs-ink/80">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">El equipo</h2>
            <p className="mt-4 text-zs-ink/85">
              Somos un equipo pequeño y deportista. Si nos preguntas por una zapatilla de
              trail, una pala de pádel o una talla de un técnico de fútbol sala, te
              respondemos con conocimiento de primera mano: usamos lo que vendemos.
            </p>
            <p className="mt-3 text-sm italic text-zs-muted">
              Próximamente añadiremos fotos y biografías del equipo. Mientras tanto, pasa por
              la tienda y nos conocemos en persona.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-zs-border bg-zs-surface/40 p-10 text-center">
            <Users className="mx-auto h-12 w-12 text-zs-blue-700/70" />
            <p className="mt-4 text-sm text-zs-muted">
              Fotos del equipo, en camino
            </p>
          </div>
        </div>
      </section>

      {/* Galería */}
      <section className="border-t border-zs-border bg-zs-surface/40 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">Lo que trabajamos</h2>
          <p className="mt-2 max-w-2xl text-zs-muted">
            Una muestra de la selección actual de nuestras dos marcas estrella, +8000 y John Smith.
            Las fotos del interior de la tienda llegarán enseguida.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GALLERY.map((item, i) => (
              <div
                key={i}
                className={`group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-zs-border bg-gradient-to-br ${item.bg}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain p-8 mix-blend-multiply transition duration-500 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-4 text-[11px] uppercase tracking-[0.18em] text-white/90 opacity-0 transition group-hover:opacity-100">
                  {item.alt}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
        <div className="rounded-3xl border border-zs-border bg-white p-8 shadow-sm sm:p-12">
          <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">
            Pasa a vernos
          </h2>
          <p className="mt-3 text-zs-ink/85">
            Estamos en {STORE_NAP.streetAddress}, en pleno centro de Puebla de la Calzada. Sin
            cita previa, con aparcamiento libre y café en la puerta.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            <li className="flex items-center gap-2 text-sm text-zs-ink">
              <MapPin className="h-4 w-4 text-zs-blue-700" />
              {STORE_NAP.postalCode} {STORE_NAP.addressLocality}
            </li>
            <li className="flex items-center gap-2 text-sm text-zs-ink">
              <Phone className="h-4 w-4 text-zs-blue-700" />
              <a href={telHref()} className="hover:text-zs-blue-700">
                +34 689 11 06 91
              </a>
            </li>
            <li className="flex items-center gap-2 text-sm text-zs-ink">
              <Mail className="h-4 w-4 text-zs-blue-700" />
              <a href={`mailto:${STORE_NAP.email}`} className="hover:text-zs-blue-700">
                {STORE_NAP.email}
              </a>
            </li>
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappUrl(WhatsAppMessages.contactFromPage("Sobre nosotros"))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
            >
              <MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp
            </a>
            <Link
              href="/contacto"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zs-border bg-white px-6 text-sm font-semibold text-zs-blue-900 hover:bg-zs-surface"
            >
              Ir al formulario de contacto
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
