import type { ReactNode } from "react";

// Degradado de marca de AVENTHRA (cian → violeta), el mismo de la landing.
export const BRAND_GRADIENT = "linear-gradient(110deg, #4CC2E8, #818CF8, #A78BFA)";

// Clases para un input/textarea dentro de <GlowField>: apagan el anillo
// blanco por defecto y dejan el borde estático tenue — el resplandor de
// marca al enfocar lo pinta <GlowField> alrededor.
export const GLOW_FIELD_INPUT_CLS =
  "border-white/10 bg-white/[0.03] outline-none focus-visible:border-white/10 focus-visible:ring-0";

/**
 * Envuelve un control de formulario y le pinta un borde en degradado de
 * marca al enfocarlo (máscara, sin tapar el relleno) — el mismo efecto
 * que el botón "Subir foto" del catálogo. El control interno debe apagar
 * su propio anillo de foco (ver `GLOW_FIELD_INPUT_CLS`).
 */
export function GlowField({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`group/glow relative rounded-lg ${className}`}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-focus-within/glow:opacity-100"
        style={{
          padding: "1px",
          background: BRAND_GRADIENT,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
    </div>
  );
}
