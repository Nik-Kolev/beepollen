const WINGS = [
  "M42,16 C36,4 24,-8 18,-2 C20,4 32,11 42,16 Z",
  "M42,17 C35,12 26,7 21,10 C19,11.5 28,16.5 42,17 Z",
];

const STINGER = "M12,27 L4,30 L12,33 Z";

const STRIPES = [
  "M15.5,22.25 A19,12 0 0 1 20.5,19.61 L20.5,40.39 A19,12 0 0 1 15.5,37.75 Z",
  "M24.5,18.51 A19,12 0 0 1 29.5,18 L29.5,42 A19,12 0 0 1 24.5,41.49 Z",
  "M33.5,18.21 A19,12 0 0 1 38.5,19.27 L38.5,40.73 A19,12 0 0 1 33.5,41.79 Z",
];

const ANTENNAE = "M50 21 q3 -6 8 -8 M45 21 q0 -7 4 -10";

export function Bee({
  className,
  outline = false,
}: {
  className?: string;
  outline?: boolean;
}) {
  return (
    <svg viewBox="0 -6 64 54" className={className} aria-hidden="true">
      {outline && (
        <g
          fill="none"
          stroke="var(--color-ground)"
          strokeWidth="4.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {WINGS.map((d) => (
            <path key={d} d={d} />
          ))}
          <path d={STINGER} />
          <ellipse cx="30" cy="30" rx="19" ry="12" />
          <circle cx="48" cy="28" r="8" />
          <path d={ANTENNAE} />
        </g>
      )}

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        {WINGS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <path d={STINGER} fill="currentColor" />

      <ellipse cx="30" cy="30" rx="19" ry="12" fill="var(--color-bee)" />

      <g fill="currentColor">
        {STRIPES.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <circle cx="48" cy="28" r="8" fill="currentColor" />
      <circle cx="51" cy="26" r="2" fill="var(--color-ground)" />

      <path
        d={ANTENNAE}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
