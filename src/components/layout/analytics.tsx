"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect } from "react";

import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { clearAnalyticsCookies } from "@/lib/analytics-cookies";

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  [disable: `ga-disable-${string}`]: boolean;
};

export function Analytics() {
  const { choice } = useCookieConsent();

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

  return choice === "accepted" && MEASUREMENT_ID ? (
    <GoogleAnalytics gaId={MEASUREMENT_ID} />
  ) : null;
}
