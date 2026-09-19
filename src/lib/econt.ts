import { cache } from "react";
import { z } from "zod";

// The office nomenclature takes no credentials; sending the demo account's
// to this host is what makes the call fail.
const OFFICES_URL =
  "https://ee.econt.com/services/Nomenclatures/NomenclaturesService.getOffices.json";

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;

const officeSchema = z.object({
  id: z.number(),
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
    // Two offices carry a location object whose coordinates are both null;
    // they belong in the list, just not on the map.
    location: z
      .object({
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
      })
      .nullable(),
  }),
});

const payloadSchema = z.object({ offices: z.array(z.unknown()) });

export type EcontOffice = {
  id: number;
  code: string;
  name: string;
  label: string;
  city: string;
  postCode: string | null;
  street: string;
  hours: string;
  phone: string | null;
  location: { lat: number; lng: number } | null;
};

const hourFormatter = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  hour: "2-digit",
  minute: "2-digit",
});

const collator = new Intl.Collator("bg-BG");

// Econt composes fullAddress as "<city> <street> №<num> <other>", and the
// city already has its own line in the list.
function streetLine(fullAddress: string, city: string): string {
  const trimmed = fullAddress.trim();

  return trimmed.startsWith(`${city} `)
    ? trimmed.slice(city.length + 1)
    : trimmed;
}

// Econtomats report their hours as 00:00–23:59 rather than a flag.
function businessHours(from: number, to: number): string {
  const opens = hourFormatter.format(from);
  const closes = hourFormatter.format(to);

  return opens === "00:00" && closes === "23:59"
    ? "Денонощно"
    : `${opens} – ${closes}`;
}

// 159 offices are named after their own city, and many more start with it.
function officeLabel(name: string, city: string): string {
  return name === city || name.startsWith(`${city} `)
    ? name
    : `${city}, ${name}`;
}

function toOffice(raw: z.infer<typeof officeSchema>): EcontOffice {
  const { address } = raw;
  const { latitude, longitude } = address.location ?? {
    latitude: null,
    longitude: null,
  };

  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    label: officeLabel(raw.name, address.city.name),
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

export const listEcontOffices = cache(async (): Promise<EcontOffice[]> => {
  const response = await fetch(OFFICES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode: "BGR" }),
    next: { revalidate: ONE_DAY_IN_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Econt getOffices responded ${response.status}`);
  }

  const payload = payloadSchema.safeParse(await response.json());

  if (!payload.success) {
    throw new Error("Econt getOffices returned an unrecognised payload");
  }

  // A malformed record drops itself rather than emptying the picker; an
  // automated station drops because an order is paid at a counter.
  const offices = payload.data.offices.flatMap((entry) => {
    const office = officeSchema.safeParse(entry);

    return office.success && !office.data.isAPS ? [toOffice(office.data)] : [];
  });

  return offices.sort(
    (a, b) =>
      collator.compare(a.city, b.city) || collator.compare(a.name, b.name),
  );
});

export function officeCount(total: number): string {
  return `${total} ${total === 1 ? "офис" : "офиса"}`;
}

export function listEcontCities(offices: EcontOffice[]): string[] {
  return [...new Set(offices.map((office) => office.city))].sort(
    collator.compare,
  );
}
