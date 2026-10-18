import { text } from "@/lib/checkout-payload";

export function withdrawalPayload(formData: FormData) {
  return {
    reference: text(formData.get("reference")),
    name: text(formData.get("name")),
    email: text(formData.get("email")),
    phone: text(formData.get("phone")),
    website: text(formData.get("website")),
  };
}
