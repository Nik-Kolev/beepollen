const supers = [21, 39, 57];

export function HiveBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 92" className={className} aria-hidden="true">
      <ellipse
        cx="40"
        cy="89.5"
        rx="28"
        ry="2.5"
        fill="var(--color-wood)"
        fillOpacity="0.12"
      />

      <path d="M18 5 H62 L66 11 H14 Z" fill="var(--color-wood)" />
      <path
        d="M19.5 7 H60.5 L62 9.5 H18 Z"
        fill="var(--color-surface)"
        fillOpacity="0.14"
      />
      <rect
        x="6"
        y="11"
        width="68"
        height="7.5"
        rx="1.5"
        fill="var(--color-wood)"
      />
      <rect
        x="6"
        y="16.5"
        width="68"
        height="2"
        fill="var(--color-ink)"
        fillOpacity="0.22"
      />

      {supers.map((y) => (
        <g key={y}>
          <rect
            x="11"
            y={y}
            width="58"
            height="3.5"
            rx="1.2"
            fill="var(--color-brand-deep)"
          />
          <rect
            x="13"
            y={y + 3.5}
            width="54"
            height="12"
            rx="1.2"
            fill="var(--color-brand)"
          />
          <rect
            x="24"
            y={y + 5.5}
            width="32"
            height="2.5"
            rx="1.25"
            fill="var(--color-brand-deep)"
          />
        </g>
      ))}

      <rect
        x="9"
        y="75"
        width="62"
        height="5"
        rx="1"
        fill="var(--color-brand-deep)"
      />
      <rect
        x="32"
        y="76.3"
        width="16"
        height="2.6"
        rx="1.3"
        fill="var(--color-wood)"
      />
      <path d="M11 80 H69 L65 85 H15 Z" fill="var(--color-wood)" />

      <rect
        x="17"
        y="85"
        width="6"
        height="4"
        rx="1"
        fill="var(--color-wood)"
      />
      <rect
        x="57"
        y="85"
        width="6"
        height="4"
        rx="1"
        fill="var(--color-wood)"
      />
    </svg>
  );
}
