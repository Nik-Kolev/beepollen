const boxes = [
  { y: 13.8, height: 11.5 },
  { y: 28.7, height: 16.5 },
  { y: 48.6, height: 16.5 },
];

const RIM = 3.4;
const STROKE = 0.7;

export function HiveBox({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 89"
      className={className}
      aria-hidden="true"
      strokeLinejoin="round"
    >
      <ellipse
        cx="38.5"
        cy="84.3"
        rx="28"
        ry="2.2"
        fill="var(--color-ink)"
        fillOpacity="0.16"
      />

      <rect
        x="3"
        y="5.4"
        width="74"
        height="5.2"
        rx="1"
        fill="var(--color-slate)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <rect
        x="3.6"
        y="5.9"
        width="72.8"
        height="1.1"
        rx="0.55"
        fill="var(--color-halo)"
        fillOpacity="0.16"
      />
      <rect
        x="6"
        y="10.6"
        width="68"
        height="3.2"
        rx="0.7"
        fill="var(--color-slate)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <rect
        x="6.4"
        y="10.9"
        width="67.2"
        height="2.6"
        rx="0.5"
        fill="var(--color-ink)"
        fillOpacity="0.34"
      />

      {boxes.map(({ y, height }) => {
        const bodyY = y + RIM;
        const gripY = bodyY + height * 0.44;

        return (
          <g key={y}>
            <rect
              x="10"
              y={y}
              width="60"
              height={RIM}
              rx="0.7"
              fill="var(--color-wood)"
              stroke="currentColor"
              strokeWidth={STROKE}
            />
            <rect
              x="10.6"
              y={y + 0.5}
              width="58.8"
              height="1"
              rx="0.5"
              fill="var(--color-halo)"
              fillOpacity="0.18"
            />

            <rect
              x="12"
              y={bodyY}
              width="56"
              height={height}
              rx="1"
              fill="var(--color-brand)"
              stroke="currentColor"
              strokeWidth={STROKE}
            />
            <rect
              x="12.4"
              y={bodyY + 0.4}
              width="9.5"
              height={height - 0.8}
              rx="0.9"
              fill="var(--color-ink)"
              fillOpacity="0.16"
            />
            <rect
              x="12.4"
              y={bodyY + 0.4}
              width="55.2"
              height="1.8"
              rx="0.8"
              fill="var(--color-ink)"
              fillOpacity="0.16"
            />

            <rect
              x="25"
              y={gripY}
              width="30"
              height="2.8"
              rx="1.4"
              fill="var(--color-ink)"
              fillOpacity="0.5"
            />
            <rect
              x="26.2"
              y={gripY + 1.9}
              width="27.6"
              height="0.7"
              rx="0.35"
              fill="var(--color-halo)"
              fillOpacity="0.25"
            />
          </g>
        );
      })}

      <rect
        x="10.4"
        y="13.8"
        width="59.2"
        height="1.6"
        rx="0.6"
        fill="var(--color-ink)"
        fillOpacity="0.26"
      />

      <rect
        x="9"
        y="68.5"
        width="62"
        height="4.4"
        rx="0.8"
        fill="var(--color-wood)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <rect
        x="20"
        y="69.2"
        width="40"
        height="2.9"
        rx="0.7"
        fill="var(--color-ink)"
        fillOpacity="0.78"
      />
      <rect
        x="21"
        y="71.1"
        width="38"
        height="0.9"
        rx="0.45"
        fill="var(--color-honey)"
      />

      <path
        d="M12 72.9 H68 L64 76.5 H16 Z"
        fill="var(--color-wood)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <path
        d="M13.4 73.6 H66.6 L65 75.1 H15 Z"
        fill="var(--color-halo)"
        fillOpacity="0.3"
      />

      <rect
        x="18"
        y="76.5"
        width="7.5"
        height="6.5"
        rx="0.7"
        fill="var(--color-wood)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <rect
        x="18.4"
        y="76.9"
        width="2.4"
        height="5.7"
        rx="0.6"
        fill="var(--color-ink)"
        fillOpacity="0.18"
      />
      <rect
        x="54.5"
        y="76.5"
        width="7.5"
        height="6.5"
        rx="0.7"
        fill="var(--color-wood)"
        stroke="currentColor"
        strokeWidth={STROKE}
      />
      <rect
        x="54.9"
        y="76.9"
        width="2.4"
        height="5.7"
        rx="0.6"
        fill="var(--color-ink)"
        fillOpacity="0.18"
      />
    </svg>
  );
}
