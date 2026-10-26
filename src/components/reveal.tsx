import type { ReactNode } from "react";

export function Reveal({
  open,
  appear = false,
  animate = true,
  className = "",
  children,
}: {
  open: boolean;
  appear?: boolean;
  animate?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      inert={!open}
      className={`grid ${
        animate
          ? "transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none"
          : ""
      } ${open ? "grid-rows-[1fr]" : "invisible grid-rows-[0fr]"} ${
        appear ? "starting:grid-rows-[0fr]" : ""
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
