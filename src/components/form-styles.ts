export const LABEL = "text-ink-soft block pl-4 text-sm font-medium";

const FIELD_BASE =
  "bg-surface text-ink placeholder:text-ink-soft focus-visible:ring-action/30 mt-2 block min-h-11 w-full rounded-lg px-4 text-base outline-hidden focus-visible:ring-2";

export const FIELD = `border-line focus-visible:border-action border ${FIELD_BASE}`;

export const FIELD_INVALID = `border-error border-2 ${FIELD_BASE}`;

export const ERROR_TEXT = "text-error mt-2 text-sm font-medium";

export const INPUT_ERROR_TEXT = `${ERROR_TEXT} pl-4`;
