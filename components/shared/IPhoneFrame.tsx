import type { ReactNode } from "react";

// Marco de iPhone (frente, isla dinámica, botones laterales decorativos).
// Solo el "hardware" — lo que va en la pantalla es el children.
export function IPhoneFrame({
  children,
  maxWidth = 380,
  className = "",
}: {
  children: ReactNode;
  maxWidth?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-full rounded-[3.25rem] p-[11px] ${className}`}
      style={{
        maxWidth,
        background: "#0a0a0b",
        boxShadow:
          "0 30px 80px -24px rgba(0,0,0,0.75), inset 0 0 0 2px rgba(255,255,255,0.06)",
      }}
    >
      {/* Botones laterales */}
      <span className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l-sm" style={{ background: "#1b1b1d" }} />
      <span className="absolute -left-[3px] top-[168px] h-14 w-[3px] rounded-l-sm" style={{ background: "#1b1b1d" }} />
      <span className="absolute -left-[3px] top-[236px] h-14 w-[3px] rounded-l-sm" style={{ background: "#1b1b1d" }} />
      <span className="absolute -right-[3px] top-[190px] h-20 w-[3px] rounded-r-sm" style={{ background: "#1b1b1d" }} />

      {/* Pantalla */}
      <div className="relative overflow-hidden rounded-[2.6rem]">
        {/* Isla dinámica */}
        <div className="pointer-events-none absolute left-1/2 top-[13px] z-30 h-[28px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}
