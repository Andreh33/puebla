"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// These are operational route roots, not matches within public product/blog slugs.
function isPrivatePath(pathname: string): boolean {
  const path = decodeURIComponent(pathname).replace(/^\/(?:es|pt|it|fr|de)(?=\/|$)/, "");
  return /^\/(?:admin|api|auth|checkout)(?:\/|$)/.test(path);
}

// URLs can contain email addresses, search text or checkout tokens. Apply this
// per event: SDK scripts remain loaded during navigation to private routes.
function publicMetricsOnly<T extends { url: string; route?: string }>(event: T): T | null {
  try {
    const url = new URL(event.url);
    if (!["http:", "https:"].includes(url.protocol) || isPrivatePath(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    const route = event.route?.split(/[?#]/, 1)[0];
    if (route && isPrivatePath(route)) return null;
    return {
      ...event,
      url: url.toString(),
      ...(route !== undefined ? { route } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Vercel's aggregate public-page metrics run independently of the optional
 * first-party counter. This component neither reads nor grants cookie consent.
 */
export function AnalyticsGate() {
  return (
    <>
      <Analytics beforeSend={publicMetricsOnly} />
      <SpeedInsights beforeSend={publicMetricsOnly} />
    </>
  );
}
