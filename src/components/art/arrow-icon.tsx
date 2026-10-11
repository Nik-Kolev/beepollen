export function ArrowIcon({
  direction,
  className,
}: {
  direction: "left" | "right";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${direction === "right" ? "-scale-x-100" : ""} ${className ?? ""}`}
    >
      <path d="M19 12H5m6-6-6 6 6 6" />
    </svg>
  );
}
