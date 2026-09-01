import type { ReactNode } from "react";

// Marco de MacBook (pantalla con notch + base de aluminio). El contenido
// va en la pantalla como children — el marco no impone fondo al contenido.
export function MacBookFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[760px] ${className}`}>
      {/* Pantalla + bisel */}
      <div
        className="relative mx-auto w-[90%] rounded-t-[20px] rounded-b-[4px] p-[10px] pt-[16px]"
        style={{ background: "#0e0f11", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        {/* Notch */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-20 flex h-[14px] w-[120px] -translate-x-1/2 items-center justify-center rounded-b-[9px]"
          style={{ background: "#0e0f11" }}
        >
          <span className="h-[5px] w-[5px] rounded-full" style={{ background: "#2b2d31" }} />
        </div>

        {/* Contenido de la pantalla */}
        <div className="overflow-hidden rounded-[9px]">{children}</div>
      </div>

      {/* Base / deck de aluminio */}
      <div
        className="relative mx-auto h-[13px] w-full rounded-b-[11px]"
        style={{ background: "linear-gradient(180deg, #cfd2d7 0%, #a9adb4 60%, #9a9ea5 100%)" }}
      >
        {/* Muesca para abrir la tapa */}
        <div
          className="absolute left-1/2 top-0 h-[6px] w-[100px] -translate-x-1/2 rounded-b-[7px]"
          style={{ background: "#8c9098" }}
        />
      </div>
      {/* Pie / sombra */}
      <div
        className="mx-auto h-[4px] w-[96%] rounded-b-[4px]"
        style={{ background: "#7c8087", boxShadow: "0 22px 40px -14px rgba(0,0,0,0.6)" }}
      />
    </div>
  );
}
