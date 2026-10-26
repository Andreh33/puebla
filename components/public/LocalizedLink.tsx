"use client";
import NextLink from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { useLocale } from "./LocaleProvider";
import { localePath, localizedContentHref } from "@/lib/i18n/routing";
export const LocalizedLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(
  function LocalizedLink({ href, ...props }, ref) {
    const locale = useLocale();
    const localized =
      typeof href === "string"
        ? localizedContentHref(locale, href)!
        : { ...href, pathname: href.pathname ? localePath(locale, href.pathname) : href.pathname };
    return <NextLink {...props} href={localized} ref={ref} />;
  },
);
