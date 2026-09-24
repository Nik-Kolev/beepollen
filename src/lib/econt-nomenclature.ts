import { z } from "zod";

import { sortOffices, type EcontOfficeRecord } from "@/lib/econt";

// Reached only by npm run econt:sync, never by the running app. The endpoint
// takes no credentials; sending the demo account's is what makes it fail.
const OFFICES_URL =
  "https://ee.econt.com/services/Nomenclatures/NomenclaturesService.getOffices.json";

// Unauthenticated but not anonymous: a caller that names itself can be
// contacted rather than blocked.
const USER_AGENT =
  "beepollen-shop/1.0 (+https://github.com/Nik-Kolev/beepollen)";

const officeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  isAPS: z.boolean(),
  phones: z.array(z.string()),
  normalBusinessHoursFrom: z.number(),
  normalBusinessHoursTo: z.number(),
  address: z.object({
    fullAddress: z.string(),
    city: z.object({
      name: z.string().min(1),
      postCode: z.string().nullable(),
    }),
    location: z
      .object({
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
      })
      .nullable(),
  }),
});

const payloadSchema = z.object({ offices: z.array(z.unknown()) });

const hourFormatter = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  hour: "2-digit",
  minute: "2-digit",
});

// Econt composes fullAddress as "<city> <street> №<num> <other>", and the
// city already has its own line in the list.
export function streetLine(fullAddress: string, city: string): string {
  const trimmed = fullAddress.trim();

  return trimmed.startsWith(`${city} `)
    ? trimmed.slice(city.length + 1)
    : trimmed;
}

// Econtomats report their hours as 00:00–23:59 rather than a flag.
export function businessHours(from: number, to: number): string {
  const opens = hourFormatter.format(from);
  const closes = hourFormatter.format(to);

  return opens === "00:00" && closes === "23:59"
    ? "Денонощно"
    : `${opens} – ${closes}`;
}

function toOffice(raw: z.infer<typeof officeSchema>): EcontOfficeRecord {
  const { address } = raw;
  const { latitude, longitude } = address.location ?? {
    latitude: null,
    longitude: null,
  };

  return {
    code: raw.code,
    name: raw.name,
    city: address.city.name,
    postCode: address.city.postCode,
    street: streetLine(address.fullAddress, address.city.name),
    hours: businessHours(
      raw.normalBusinessHoursFrom,
      raw.normalBusinessHoursTo,
    ),
    phone: raw.phones[0] ?? null,
    location:
      latitude !== null && longitude !== null
        ? { lat: latitude, lng: longitude }
        : null,
  };
}

export function parseEcontOffices(payload: unknown): EcontOfficeRecord[] {
  const parsed = payloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Econt getOffices returned an unrecognised payload");
  }

  // A malformed record drops itself rather than emptying the picker; an
  // automated station drops because an order is paid at a counter.
  const offices = parsed.data.offices.flatMap((entry) => {
    const office = officeSchema.safeParse(entry);

    return office.success && !office.data.isAPS ? [toOffice(office.data)] : [];
  });

  return sortOffices(offices);
}

export async function fetchEcontOffices(): Promise<EcontOfficeRecord[]> {
  const response = await fetch(OFFICES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ countryCode: "BGR" }),
  });

  if (!response.ok) {
    throw new Error(`Econt getOffices responded ${response.status}`);
  }

  return parseEcontOffices(await response.json());
}
