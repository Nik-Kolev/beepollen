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

const centre = ([col, row]: readonly [number, number]) => ({
  cx: col * STEP_X + (row % 2 ? HALF_W : 0),
  cy: row * STEP_Y,
});

const variants = {
  climb: [
    [1, 4],
    [0, 3],
    [1, 3],
    [1, 2],
    [2, 2],
    [2, 1],
  ],
  climbRight: [
    [1, 4],
    [0, 3],
    [1, 3],
    [2, 3],
    [2, 2],
    [2, 1],
  ],
  climbStep: [
    [2, 4],
    [0, 3],
    [1, 3],
    [1, 2],
    [2, 2],
    [2, 1],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

export type HoneycombVariant = keyof typeof variants;

const VIEW_BOX = "-1 2.5 38.36 47.5";

export function HoneycombMark({
  variant = "climb",
  className,
}: {
  variant?: HoneycombVariant;
  className?: string;
}) {
  return (
    <svg viewBox={VIEW_BOX} className={className} aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        {variants[variant].map((cell) => {
          const { cx, cy } = centre(cell);
          return <path key={`${cell[0]}-${cell[1]}`} d={hexPath(cx, cy)} />;
        })}
      </g>
    </svg>
  );
}
