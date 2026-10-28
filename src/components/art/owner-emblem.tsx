import { useId } from "react";

const CENTRE = 100;
const RING_R = 90;

type Point = readonly [x: number, y: number];
type Hex = readonly [cx: number, cy: number, r: number];
type PlacedBee = { x: number; y: number; rotate: number; flip: boolean };

type Flower = {
  x: number;
  y: number;
  stemTop: Point;
  centreR: number;
  centreStroke: number;
  stroke: number;
  stemStroke: number;
  petals: readonly string[];
};

type Variant = {
  ringStroke: number;
  hexes: readonly Hex[];
  hexStroke: number;
  flower: Flower;
  leaves: readonly string[];
  bees: readonly PlacedBee[];
  bee: { kind: "classic" } | { kind: "label"; stripes: 2 | 3 };
};

const round = (n: number) => Math.round(n * 100) / 100;

function polarPoint(x: number, y: number, r: number, degrees: number): Point {
  const a = (degrees * Math.PI) / 180;
  return [x + r * Math.cos(a), y + r * Math.sin(a)];
}

function polar(x: number, y: number, r: number, degrees: number) {
  const [px, py] = polarPoint(x, y, r, degrees);
  return `${round(px)},${round(py)}`;
}

function arcPetals(x: number, y: number, cuspR: number, petalR: number) {
  return [0, 1, 2, 3, 4].map((k) => {
    const angle = -90 + 72 * k;
    return `M${polar(x, y, cuspR, angle - 36)} A${petalR},${petalR} 0 1 1 ${polar(x, y, cuspR, angle + 36)}`;
  });
}

const PETALS = [
  [50.6, 23.2],
  [131.3, 22.8],
  [203.3, 23],
  [270.7, 22.9],
  [338.8, 23.5],
] as const;
const HEAD_R = 10.4;
const CUSP_R = 18;

function tangentPoint(
  from: Point,
  centre: Point,
  r: number,
  side: 1 | -1,
): Point {
  const dx = from[0] - centre[0];
  const dy = from[1] - centre[1];
  const angle = Math.atan2(dy, dx) + side * Math.acos(r / Math.hypot(dx, dy));
  return [centre[0] + r * Math.cos(angle), centre[1] + r * Math.sin(angle)];
}

const pointText = ([px, py]: Point) => `${round(px)},${round(py)}`;

function cuspAngle(i: number) {
  const before = PETALS[(i + 4) % 5][0];
  const axis = PETALS[i][0];
  return axis - ((axis - before + 360) % 360) / 2;
}

function neckedPetals(x: number, y: number) {
  return PETALS.map(([axis, distance], i) => {
    const cuspBefore = cuspAngle(i);
    const cuspAfter = cuspAngle((i + 1) % 5);
    const head = polarPoint(x, y, distance, axis);
    const start = tangentPoint(
      polarPoint(x, y, CUSP_R, cuspBefore),
      head,
      HEAD_R,
      1,
    );
    const end = tangentPoint(
      polarPoint(x, y, CUSP_R, cuspAfter),
      head,
      HEAD_R,
      -1,
    );
    const a = (axis * Math.PI) / 180;
    const behindHead =
      (start[0] + end[0] - 2 * head[0]) * Math.cos(a) +
        (start[1] + end[1] - 2 * head[1]) * Math.sin(a) <
      0;
    return [
      `M${polar(x, y, CUSP_R, cuspBefore)}`,
      `L${pointText(start)}`,
      `A${HEAD_R},${HEAD_R} 0 ${behindHead ? 1 : 0} 1 ${pointText(end)}`,
      `L${polar(x, y, CUSP_R, cuspAfter)}`,
    ].join(" ");
  });
}

function hexPath([cx, cy, r]: Hex) {
  const halfW = (r * Math.sqrt(3)) / 2;
  return [
    `M${cx},${cy - r}`,
    `L${round(cx + halfW)},${cy - r / 2}`,
    `L${round(cx + halfW)},${cy + r / 2}`,
    `L${cx},${cy + r}`,
    `L${round(cx - halfW)},${cy + r / 2}`,
    `L${round(cx - halfW)},${cy - r / 2}`,
    "Z",
  ].join(" ");
}

const MEASURED_HEXES: readonly Hex[] = [
  [91, 8.5, 11.2],
  [113.5, 8.5, 11.2],
  [102.3, 31.6, 11.2],
  [128, 32.5, 11.5],
  [144.9, 55.6, 11.9],
  [53.6, 117, 13.3],
  [38.2, 143.5, 13.3],
  [71.2, 160.7, 13.6],
  [146.8, 118.7, 13],
  [162.8, 145.4, 13.3],
  [129.5, 162.1, 13.6],
];

const MEASURED_LEAVES = [
  "M98.5,142.4 C94,128.7 84,121.6 71.8,125.2 C77.4,139.5 89,145.5 98.5,145.5 Z",
  "M101.5,144.1 C105.7,129.8 116,122.6 127.2,126 C125,140.3 110.4,146.3 101.5,145.1 Z",
];

const LABEL_BEES: readonly PlacedBee[] = [
  { x: 55.1, y: 50.8, rotate: -5, flip: false },
  { x: 40.1, y: 84.7, rotate: -2, flip: false },
  { x: 161.9, y: 87.9, rotate: 3, flip: true },
];

function measuredFlower(x: number, stemX: number): Flower {
  const y = 83.4;
  return {
    x,
    y,
    stemTop: [stemX, y + CUSP_R],
    centreR: 6.2,
    centreStroke: 3.2,
    stroke: 3.2,
    stemStroke: 3.9,
    petals: neckedPetals(x, y),
  };
}

const variants = {
  a: {
    ringStroke: 2.4,
    hexes: [
      [90, 6, 12.5],
      [114, 6, 12.5],
      [102, 32, 12.5],
      [127, 33, 12.5],
      [144, 55, 12.5],
      [53, 116.5, 12.5],
      [38, 142, 12.5],
      [70, 160.5, 12.5],
      [147, 118.5, 12.5],
      [163, 145.5, 12.5],
      [129, 161.5, 12.5],
    ],
    hexStroke: 2.4,
    flower: {
      x: 100,
      y: 84,
      stemTop: [100, 96.6],
      centreR: 6.2,
      centreStroke: 3,
      stroke: 3,
      stemStroke: 3,
      petals: arcPetals(100, 84, 12.6, 12),
    },
    leaves: [
      "M100,145 C89,145 77,134 72,123 C84,125 95,132 100,140",
      "M100,145 C111,145 123,134 128,123 C116,125 105,132 100,140",
    ],
    bees: [
      { x: 55, y: 51, rotate: -20, flip: false },
      { x: 39.5, y: 86.5, rotate: -20, flip: false },
      { x: 161.5, y: 88, rotate: -20, flip: true },
    ],
    bee: { kind: "classic" },
  },
  b: {
    ringStroke: 3.4,
    hexes: MEASURED_HEXES,
    hexStroke: 2.7,
    flower: measuredFlower(100, 100),
    leaves: MEASURED_LEAVES,
    bees: LABEL_BEES,
    bee: { kind: "label", stripes: 2 },
  },
  c: {
    ringStroke: 3.4,
    hexes: MEASURED_HEXES,
    hexStroke: 2.7,
    flower: measuredFlower(100, 100),
    leaves: MEASURED_LEAVES,
    bees: LABEL_BEES,
    bee: { kind: "label", stripes: 3 },
  },
  d: {
    ringStroke: 3.4,
    hexes: MEASURED_HEXES,
    hexStroke: 2.7,
    flower: measuredFlower(101.2, 100.9),
    leaves: MEASURED_LEAVES,
    bees: LABEL_BEES,
    bee: { kind: "label", stripes: 2 },
  },
} as const satisfies Record<string, Variant>;

export type OwnerEmblemVariant = keyof typeof variants;

function ClassicBee() {
  return (
    <g stroke="var(--color-bee-dark)" strokeWidth="0.9" strokeLinejoin="round">
      <ellipse
        cx="-2.5"
        cy="-6"
        rx="5.5"
        ry="3"
        transform="rotate(35 -2.5 -6)"
        fill="var(--color-emblem-wing)"
      />
      <path d="M-8.5,1 L-11,2 L-8.4,3 Z" fill="var(--color-bee-dark)" />
      <ellipse cx="-1" cy="1" rx="7.5" ry="4.6" fill="var(--color-bee)" />
      <path
        d="M-4,-3 Q-5,1 -4,5.2 M1,-3.5 Q0,1 1,5.5"
        fill="none"
        strokeWidth="2"
      />
      <ellipse
        cx="1"
        cy="-5.5"
        rx="4.5"
        ry="2.5"
        transform="rotate(60 1 -5.5)"
        fill="var(--color-emblem-wing)"
      />
      <circle cx="8" cy="-0.5" r="3.4" fill="var(--color-bee-dark)" />
      <path d="M9,-3.6 Q9.5,-6.5 11.5,-7.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

const BODY_RX = 8.6;
const BODY_RY = 3.95;

const BODY_BANDS = {
  2: {
    base: "var(--color-bee)",
    band: "var(--color-bee-dark)",
    spans: [
      [-BODY_RX, -4.6],
      [-1, 1.6],
      [5.4, BODY_RX],
    ],
  },
  3: {
    base: "var(--color-bee-dark)",
    band: "var(--color-bee)",
    spans: [
      [-5.6, -3.8],
      [-1.8, 0],
      [1.8, 3.6],
    ],
  },
} as const;

function LabelBee({
  stripes,
  bodyClipId,
}: {
  stripes: 2 | 3;
  bodyClipId: string;
}) {
  const bands = BODY_BANDS[stripes];
  return (
    <g
      stroke="var(--color-bee-dark)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <ellipse
        cx="-9"
        cy="0"
        rx="3.8"
        ry="2.6"
        transform="rotate(-20 -9 0)"
        fill="var(--color-emblem-wing)"
      />
      <g transform="translate(-2.48 4.68) rotate(-30.6)">
        <ellipse rx={BODY_RX} ry={BODY_RY} fill={bands.base} stroke="none" />
        <g clipPath={`url(#${bodyClipId})`} fill={bands.band} stroke="none">
          {bands.spans.map(([from, to]) => (
            <rect
              key={from}
              x={from}
              y={-BODY_RY}
              width={to - from}
              height={BODY_RY * 2}
            />
          ))}
        </g>
        <ellipse rx={BODY_RX} ry={BODY_RY} fill="none" />
        <path
          d="M-7.9,-1.5 L-10.6,0 L-7.9,1.5 Z"
          fill="var(--color-bee-dark)"
        />
      </g>
      <ellipse
        cx="-5"
        cy="-5.7"
        rx="7.7"
        ry="3.5"
        transform="rotate(11 -5 -5.7)"
        fill="var(--color-emblem-wing)"
      />
      <circle cx="9.1" cy="-1.7" r="4.4" fill="var(--color-emblem-head)" />
      <path d="M10.6,-5.9 Q11.4,-7.8 11.8,-9.2" fill="none" />
      <circle
        cx="11.9"
        cy="-9.6"
        r="1.3"
        fill="var(--color-bee-dark)"
        stroke="none"
      />
    </g>
  );
}

export function OwnerEmblem({
  variant = "b",
  className,
}: {
  variant?: OwnerEmblemVariant;
  className?: string;
}) {
  const clipId = useId();
  const bodyClipId = useId();
  const v: Variant = variants[variant];
  const { flower } = v;

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <clipPath id={clipId}>
        <circle cx={CENTRE} cy={CENTRE} r={RING_R} />
      </clipPath>
      <clipPath id={bodyClipId}>
        <ellipse rx={BODY_RX} ry={BODY_RY} />
      </clipPath>

      <g
        fill="none"
        stroke="var(--color-emblem)"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <g strokeWidth={v.hexStroke} clipPath={`url(#${clipId})`}>
          {v.hexes.map((hex) => (
            <path key={`${hex[0]}-${hex[1]}`} d={hexPath(hex)} />
          ))}
        </g>

        <circle cx={CENTRE} cy={CENTRE} r={RING_R} strokeWidth={v.ringStroke} />

        <g strokeWidth={flower.stroke}>
          <path
            d={`M${flower.stemTop[0]},${flower.stemTop[1]} L${CENTRE},${CENTRE + RING_R}`}
            strokeWidth={flower.stemStroke}
          />
          {v.leaves.map((d) => (
            <path key={d} d={d} />
          ))}
          {flower.petals.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <circle
          cx={flower.x}
          cy={flower.y}
          r={flower.centreR}
          strokeWidth={flower.centreStroke}
        />
      </g>

      {v.bees.map(({ x, y, rotate, flip }) => (
        <g
          key={`${x}-${y}`}
          transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""} rotate(${rotate})`}
        >
          {v.bee.kind === "classic" ? (
            <ClassicBee />
          ) : (
            <LabelBee stripes={v.bee.stripes} bodyClipId={bodyClipId} />
          )}
        </g>
      ))}
    </svg>
  );
}
