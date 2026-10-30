export const LABEL = "text-ink-soft block pl-4 text-sm font-medium";

const FIELD_BASE =
  "bg-surface text-ink placeholder:text-ink-soft mt-2 block min-h-12 w-full rounded-lg px-4 text-base focus-visible:outline-1 focus-visible:outline-offset-0";

export const FIELD = `border-ink-soft focus-visible:border-ink border ${FIELD_BASE}`;

export const FIELD_INVALID = `border-error border-2 ${FIELD_BASE}`;

export const ERROR_TEXT = "text-error mt-2 text-sm font-medium";

export const INPUT_ERROR_TEXT = `${ERROR_TEXT} pl-4`;
