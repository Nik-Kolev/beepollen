const R = 12;
const TILE_W = 20.78;
const TILE_H = 36;

function hexPath(cx: number, cy: number) {
  const half = TILE_W / 2;
  return [
    `M${cx},${cy - R}`,
    `L${cx + half},${cy - R / 2}`,
    `L${cx + half},${cy + R / 2}`,
    `L${cx},${cy + R}`,
    `L${cx - half},${cy + R / 2}`,
    `L${cx - half},${cy - R / 2}`,
    "Z",
  ].join(" ");
}

const cells = [
  [0, 0],
  [TILE_W, 0],
  [0, TILE_H],
  [TILE_W, TILE_H],
  [TILE_W / 2, TILE_H / 2],
] as const;

export function Honeycomb({
  className,
  id = "honeycomb",
}: {
  className?: string;
  id?: string;
}) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern
          id={id}
          width={TILE_W}
          height={TILE_H}
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="currentColor" strokeWidth="1.25">
            {cells.map(([cx, cy]) => (
              <path key={`${cx}-${cy}`} d={hexPath(cx, cy)} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
