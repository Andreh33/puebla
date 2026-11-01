"use client";


import { useTranslatedValue, useTranslatedTemplate } from "@/components/public/LocaleProvider";
import type { LinkProps } from "next/link";
import { LocalizedLink as Link } from "./LocalizedLink";
import { localePath } from "@/lib/i18n/routing";
import { useLocale } from "./LocaleProvider";
import { useRouter } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

/**
 * PageTransitionLink — usa View Transitions API si está disponible.
 * Si no, hace navegación normal (el template `app/(public)/template.tsx`
 * se encarga del fade/slide-up de entrada).
 */
export const PageTransitionLink = forwardRef<HTMLAnchorElement, Props>(
  function PageTransitionLink({ children, onClick, href, ...rest }, ref) {
  const tx = useTranslatedValue();
    const router = useRouter();
    const locale = useLocale();

    function handleClick(e: MouseEvent<HTMLAnchorElement>) {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (typeof href !== "string") return;
      if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };
      if (typeof doc.startViewTransition === "function") {
        e.preventDefault();
        doc.startViewTransition(() => {
          router.push(localePath(locale,href));
        });
      }
    }

    return (
      <Link ref={ref} href={href} onClick={handleClick} {...rest}>
        {tx(children)}
      </Link>
    );
  },
);
