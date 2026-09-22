// The checkout form renders these and the order service stores the one that was
// ticked, so a later rewording never restates what an old customer agreed to.
export const CONSENT_WORDING = {
  TERMS: "Съгласен съм с общите условия и политиката за поверителност.",
  OFFERS: "Искам да получавам оферти и напомняния по имейл.",
} as const;
