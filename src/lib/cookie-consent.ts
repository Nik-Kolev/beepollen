export const COOKIE_CONSENT_KEY = "beepollen.cookie-consent";

export const COOKIE_CHOICES = ["accepted", "rejected"] as const;
export type CookieChoice = (typeof COOKIE_CHOICES)[number];

export function parseCookieChoice(raw: string | null): CookieChoice | null {
  return COOKIE_CHOICES.find((choice) => choice === raw) ?? null;
}
