export const LABEL = "text-ink-soft block pl-4 text-sm font-medium";

const FIELD_BASE =
  "bg-surface text-ink placeholder:text-ink-soft focus-visible:border-action focus-visible:ring-action/30 mt-2 block min-h-11 w-full rounded-lg px-4 text-base outline-hidden focus-visible:ring-2";

export const FIELD = `border-line border ${FIELD_BASE}`;

export const FIELD_INVALID = `border-ink border-2 ${FIELD_BASE}`;
