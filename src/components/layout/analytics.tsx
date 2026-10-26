"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { clearAnalyticsCookies } from "@/lib/analytics-cookies";

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const TOKEN_PAGES = "/subscription/";

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  [disable: `ga-disable-${string}`]: boolean;
};

export function Analytics() {
  const { choice } = useCookieConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (!choice) return;

    const page = window as AnalyticsWindow;
    const granted = choice === "accepted";

    if (MEASUREMENT_ID) page[`ga-disable-${MEASUREMENT_ID}`] = !granted;
    page.gtag?.("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
    });
    if (!granted) clearAnalyticsCookies();
  }, [choice]);

  const tokenPage = pathname.startsWith(TOKEN_PAGES);

  useEffect(() => {
    if (choice !== "accepted" || !MEASUREMENT_ID) return;

    (window as AnalyticsWindow)[`ga-disable-${MEASUREMENT_ID}`] = tokenPage;
  }, [choice, tokenPage]);

  return choice === "accepted" && MEASUREMENT_ID && !tokenPage ? (
    <GoogleAnalytics gaId={MEASUREMENT_ID} />
  ) : null;
}
