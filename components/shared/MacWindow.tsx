import type { ReactNode } from "react";

// Marco de ventana estilo macOS (barra de título con los tres botones +
// título centrado). Modo oscuro para encajar con el panel. El contenido va
// como children — el marco no impone fondo al body, lo pone quien lo usa.
export function MacWindow({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border ${className}`}
      style={{
        borderColor: "rgba(255,255,255,0.1)",
        boxShadow: "0 30px 70px -24px rgba(0,0,0,0.75)",
      }}
    >
      {/* Barra de título */}
      <div
        className="relative flex h-10 items-center px-4"
        style={{ background: "#2c2c2e", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        {title && (
          <span
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 truncate text-[13px] font-semibold"
            style={{ color: "#e5e5e7" }}
          >
            {title}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
