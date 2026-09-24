export type EcontOffice = {
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

// What the committed snapshot and the table hold. The label is derived on the
// way out of both, so it cannot drift from the name and city it is built from.
export type EcontOfficeRecord = Omit<EcontOffice, "label">;

const collator = new Intl.Collator("bg-BG");

// 159 offices are named after their own city, and many more start with it.
export function officeLabel(name: string, city: string): string {
  return name === city || name.startsWith(`${city} `)
    ? name
    : `${city}, ${name}`;
}

export function officeCount(total: number): string {
  return `${total} ${total === 1 ? "офис" : "офиса"}`;
}

export function listEcontCities(offices: EcontOffice[]): string[] {
  return [...new Set(offices.map((office) => office.city))].sort(
    collator.compare,
  );
}

// SQLite orders Cyrillic by code point, so the list is ordered here instead.
export function sortOffices<T extends EcontOfficeRecord>(offices: T[]): T[] {
  return [...offices].sort(
    (a, b) =>
      collator.compare(a.city, b.city) || collator.compare(a.name, b.name),
  );
}
