const R = 7;
const STEP_X = 12.12;
const STEP_Y = 10.5;
const HALF_W = 6.06;

function hexPath(cx: number, cy: number) {
  return [
    `M${cx},${cy - R}`,
    `L${cx + HALF_W},${cy - R / 2}`,
    `L${cx + HALF_W},${cy + R / 2}`,
    `L${cx},${cy + R}`,
    `L${cx - HALF_W},${cy + R / 2}`,
    `L${cx - HALF_W},${cy - R / 2}`,
    "Z",
  ].join(" ");
}

// Each column sits one row higher than the last, so the run climbs from the
// bottom left to the top right.
const cells = [
  [1, 4],
  [0, 3],
  [1, 3],
  [1, 2],
  [2, 2],
  [2, 1],
] as const;

export function HoneycombMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-1 2.5 38.4 47.5" className={className} aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        {cells.map(([col, row]) => (
          <path
            key={`${col}-${row}`}
            d={hexPath(col * STEP_X + (row % 2 ? HALF_W : 0), row * STEP_Y)}
          />
        ))}
      </g>
    </svg>
  );
}
