"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MEGA_MENU,
  type MegaMenuGroup,
  type MegaMenuKey,
  type MegaMenuSection,
  buildMegaMenuHref,
} from "@/lib/menu/mega-menu";

/**
 * MegaMenu — panel desplegable estilo Nike / Decathlon que se ancla al
 * Header. Se monta una sola instancia y el Header le pasa qué tab está
 * abierto (`activeKey`). Es responsable únicamente de la presentación.
 *
 * El componente NO controla el estado open/closed por su cuenta — toda la
 * orquestación (hover, focus, escape, click-outside) vive en el Header,
 * que es quien sabe cuál de los 3 tabs disparó la apertura.
 */
export type MegaMenuProps = {
  /** Tab abierto actualmente. `null` = panel cerrado. */
  activeKey: MegaMenuKey | null;
  /** Handler para que el contenido pueda solicitar cierre (link clicked, Esc). */
  onClose: () => void;
  /**
   * Handlers para que el panel mantenga el "hover bridge" — si el usuario mueve
   * el cursor desde el tab al panel sin salir, se mantiene abierto.
   */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** id del elemento que dispara el panel — para aria-labelledby. */
  triggerId?: string;
};

export function MegaMenu({
  activeKey,
  onClose,
  onMouseEnter,
  onMouseLeave,
  triggerId,
}: MegaMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const open = activeKey !== null;
  const tab = open ? MEGA_MENU[activeKey] : null;

  // Cerrar al pulsar Escape mientras el panel está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      ref={panelRef}
      id={panelId}
      role="menu"
      aria-labelledby={triggerId}
      aria-hidden={!open}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "absolute left-0 right-0 top-full z-30 hidden border-b border-zs-border bg-white/95 backdrop-blur-xl shadow-2xl",
        "transition-[opacity,transform] duration-200 ease-out lg:block",
        open
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      {/* Puente invisible: extiende la zona de hover ~20px hacia arriba para
          cubrir el gap entre la pill flotante del header y el panel. Sin esto
          el cursor "cae" en zona muerta al bajar y el menú se cierra antes
          de llegar. Como es hijo del panel (que tiene onMouseEnter), mantiene
          el hover vivo al cruzar el hueco. */}
      {open && (
        <span aria-hidden className="absolute inset-x-0 -top-5 h-5" />
      )}
      {tab && (
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Hero lifestyle sticky a la izquierda.
             *
             * Fijamos `aspect-[4/5]` y `max-h-[420px]` para que la imagen no
             * se estire en vertical cuando el tab "Niños" (3 secciones +
             * accesorios) hace crecer el alto del panel. Sin esto, el hero
             * heredaba toda la altura del grid y la foto se veía gigante.
             *
             * `self-start` evita que `align-items: stretch` del grid fuerce
             * al hero a tomar la altura del contenido a la derecha.
             */}
            <Link
              href={tab.href}
              onClick={onClose}
              className="group relative isolate flex aspect-[4/5] max-h-[420px] w-full flex-col justify-end self-start overflow-hidden rounded-2xl bg-zs-surface"
            >
              <Image
                src={tab.heroImage}
                alt={tab.label}
                fill
                sizes="260px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
              />
              <div className="relative p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                  Sección
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">
                  {tab.label}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 group-hover:underline">
                  Ver toda la sección
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            {/* Contenido — Mujer/Hombre = 1 sección · Niños = 2 secciones */}
            <div className="flex flex-col gap-8">
              {tab.sections.map((section) => (
                <SectionGroups
                  key={section.gender}
                  section={section}
                  showSectionLabel={tab.sections.length > 1}
                  onItemClick={onClose}
                />
              ))}

              {/* Accesorios compartidos (sólo Niños) */}
              {tab.sharedAccessories && (
                <SharedAccessoriesRow
                  group={tab.sharedAccessories}
                  sections={tab.sections}
                  onItemClick={onClose}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function SectionGroups({
  section,
  showSectionLabel,
  onItemClick,
}: {
  section: MegaMenuSection;
  showSectionLabel: boolean;
  onItemClick: () => void;
}) {
  return (
    <div>
      {showSectionLabel && (
        <h3 className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-zs-blue-900">
          {section.label}
        </h3>
      )}
      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {section.groups.map((group) => (
          <GroupColumn
            key={`${section.gender}-${group.title}`}
            group={group}
            gender={section.gender}
            onItemClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
}

function GroupColumn({
  group,
  gender,
  onItemClick,
}: {
  group: MegaMenuGroup;
  gender: MegaMenuSection["gender"];
  onItemClick: () => void;
}) {
  return (
    <div role="group" aria-label={group.title}>
      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-zs-ink">
        {group.title}
      </h4>
      <ul className="flex flex-col gap-1.5">
        {group.items.map((item) => (
          <li key={`${gender}-${item.slug}`}>
            <Link
              role="menuitem"
              href={buildMegaMenuHref(item.slug, gender)}
              onClick={onItemClick}
              className="group inline-flex items-center gap-1 py-1 text-sm text-zs-ink transition-colors hover:text-zs-blue-900 focus-visible:text-zs-blue-900 focus-visible:outline-none"
            >
              <span className="relative">
                {item.label}
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-zs-blue-900 transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Fila de accesorios compartida (sólo Niños). Mostramos un único bloque que
 * navega usando el género del primer sub-tab (NINO) por convención: la
 * sub-categoría de accesorio no tiene género propio en la taxonomía del
 * cliente — un balón es un balón sea para niño o niña.
 *
 * Para que el filtro `genero` siga teniendo sentido, exponemos un toggle
 * de chips (Niño / Niña) que cambia el query param de los links.
 */
function SharedAccessoriesRow({
  group,
  sections,
  onItemClick,
}: {
  group: MegaMenuGroup;
  sections: MegaMenuSection[];
  onItemClick: () => void;
}) {
  // Por defecto los accesorios de Niños usan el primer sub-género disponible.
  const defaultGender = sections[0]?.gender ?? "NINO";

  return (
    <div className="rounded-2xl border border-zs-border bg-zs-surface/50 p-5">
      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-zs-ink">
        {group.title}
      </h4>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {group.items.map((item) => (
          <li key={`accesorios-${item.slug}`}>
            <Link
              role="menuitem"
              href={buildMegaMenuHref(item.slug, defaultGender)}
              onClick={onItemClick}
              className="group inline-flex items-center gap-1 py-1 text-sm text-zs-ink transition-colors hover:text-zs-blue-900 focus-visible:text-zs-blue-900 focus-visible:outline-none"
            >
              <span className="relative">
                {item.label}
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-zs-blue-900 transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variante mobile — acordeón embebido en el drawer del Header
// ---------------------------------------------------------------------------

export type MegaMenuMobileProps = {
  tabKey: MegaMenuKey;
  expanded: boolean;
  /** Id del button que dispara este panel — para aria-controls accesible. */
  contentId: string;
  onLinkClick: () => void;
};

/**
 * Panel mobile: muestra el contenido del mega-menú dentro del drawer del
 * Header. NO renderiza el trigger — la fila de cabecera (link + caret) la
 * controla el Header, que combina navegación a la landing del género con
 * el toggle del panel en una sola fila compacta.
 */
export function MegaMenuMobile({
  tabKey,
  expanded,
  contentId,
  onLinkClick,
}: MegaMenuMobileProps) {
  const tab = MEGA_MENU[tabKey];

  return (
    <>
      <div
        id={contentId}
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-5 px-3 pb-4 pt-1">
            <Link
              href={tab.href}
              onClick={onLinkClick}
              className="inline-flex items-center gap-1 text-sm font-semibold text-zs-blue-900 underline-offset-4 hover:underline"
            >
              Ver toda la sección {tab.label}
              <ArrowRight className="h-4 w-4" />
            </Link>

            {tab.sections.map((section) => (
              <div key={section.gender}>
                {tab.sections.length > 1 && (
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-zs-blue-900">
                    {section.label}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.groups.map((group) => (
                    <div key={`${section.gender}-${group.title}`}>
                      <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-zs-muted">
                        {group.title}
                      </p>
                      <ul className="flex flex-col">
                        {group.items.map((item) => (
                          <li key={`${section.gender}-${item.slug}`}>
                            <Link
                              href={buildMegaMenuHref(item.slug, section.gender)}
                              onClick={onLinkClick}
                              className="block py-1.5 text-[15px] text-zs-ink hover:text-zs-blue-700"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {tab.sharedAccessories && (
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-zs-muted">
                  {tab.sharedAccessories.title}
                </p>
                <ul className="grid grid-cols-2 gap-x-3">
                  {tab.sharedAccessories.items.map((item) => (
                    <li key={`accesorios-${item.slug}`}>
                      <Link
                        href={buildMegaMenuHref(
                          item.slug,
                          tab.sections[0]?.gender ?? "NINO",
                        )}
                        onClick={onLinkClick}
                        className="block py-1.5 text-[15px] text-zs-ink hover:text-zs-blue-700"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
