import { Bee } from "@/components/art/bee";

// Cart body from Google's Material Symbols (Apache 2.0), weight 200, with the
// lower shelf raised and the solid wheels redrawn as rings.
const BODY =
  "M235.23-740 342-515.38h265.38q6.93 0 12.31-3.47 5.39-3.46 9.23-9.61l104.62-190q4.61-8.46.77-15-3.85-6.54-13.08-6.54h-486Zm-19.54-40h520.77q26.08 0 39.23 21.27 13.16 21.27 1.39 43.81l-114.31 208.3q-8.69 14.62-22.58 22.93-13.88 8.31-30.5 8.31H324l-48.62 49.23q-6.15 9.23-.38 20 5.77 10.77 17.31 10.77h435.38v40H292.31q-35 0-52.23-29.5-17.23-29.5-.85-59.27l60.15-107.23L152.31-820H80v-40h97.69l38 80ZM342-515.38h280-280Z";

const WHEEL_STROKE = 44;
const WHEEL_OUTER = 82;

export function CartMark({ className }: { className?: string }) {
  return (
    <span className={`relative block ${className ?? ""}`}>
      <svg
        viewBox="-48 -1008 1056 1056"
        className="size-full"
        aria-hidden="true"
        fill="currentColor"
      >
        <g transform="translate(0 50)">
          <path d={BODY} />
          <g fill="none" stroke="currentColor" strokeWidth={WHEEL_STROKE}>
            <circle cx="322.31" cy="-238" r={WHEEL_OUTER - WHEEL_STROKE / 2} />
            <circle cx="697.69" cy="-238" r={WHEEL_OUTER - WHEEL_STROKE / 2} />
          </g>
        </g>
      </svg>

      <Bee className="absolute top-[1px] -left-[25px] w-[62%] -rotate-12" />
    </span>
  );
}
