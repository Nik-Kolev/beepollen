export function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function items(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return [];

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export function checkoutPayload(formData: FormData) {
  return {
    name: text(formData.get("name")),
    email: text(formData.get("email")),
    phone: text(formData.get("phone")),
    items: items(formData.get("items")),
    deliveryMethod:
      formData.get("localDelivery") === "on" ? "LOCAL" : "ECONT_OFFICE",
    officeCode: text(formData.get("officeCode")),
    acceptsTerms: formData.get("acceptsTerms") === "on",
    acceptsOffers: formData.get("acceptsOffers") === "on",
    idempotencyKey: text(formData.get("idempotencyKey")),
    website: text(formData.get("website")),
  };
}

export function newIdempotencyKey(random: Crypto = crypto) {
  if (typeof random.randomUUID === "function") return random.randomUUID();

  const bytes = random.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((group) => group.join(""))
    .join("-");
}
