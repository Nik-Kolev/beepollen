function text(value: FormDataEntryValue | null) {
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
    officeCode: text(formData.get("officeCode")),
    acceptsTerms: formData.get("acceptsTerms") === "on",
    acceptsOffers: formData.get("acceptsOffers") === "on",
    idempotencyKey: text(formData.get("idempotencyKey")),
    website: text(formData.get("website")),
  };
}
