export type CarrierId = "econt" | "speedy";

export type Carrier = {
  id: CarrierId;
  name: string;
  available: boolean;
};

// Speedy's office list needs API credentials issued against a courier
// contract, so its offices cannot be fetched until that account exists.
export const CARRIERS: Carrier[] = [
  { id: "econt", name: "Еконт", available: true },
  { id: "speedy", name: "Спиди", available: false },
];

export const DEFAULT_CARRIER: CarrierId = "econt";
