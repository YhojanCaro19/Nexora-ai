// components/dashboard/shared/CreditCoin.tsx
//
// La moneda de créditos de AVENTHRA — SVG con el degradado de marca
// (cian → índigo → violeta → rosa, el mismo de .aventhra-iridescent) y un
// brillo. Escalable: el tamaño se pasa por className (h-*/w-*).
//
// El resplandor va como drop-shadow por className desde quien la usa, para
// poder ajustar su fuerza según el contexto (badge del header vs. tarjeta
// grande de créditos).
import type { SVGProps } from "react";

export function CreditCoin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <defs>
        <linearGradient id="aventhra-coin-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4CC2E8" />
          <stop offset="0.38" stopColor="#818CF8" />
          <stop offset="0.68" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#E879C7" />
        </linearGradient>
        <radialGradient id="aventhra-coin-shine" cx="0.34" cy="0.28" r="0.75">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cuerpo de la moneda */}
      <circle cx="16" cy="16" r="13" fill="url(#aventhra-coin-face)" />
      {/* Borde interno (bisel) */}
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      {/* Reflejo */}
      <circle cx="16" cy="16" r="13" fill="url(#aventhra-coin-shine)" />
      {/* Chispa central — el lenguaje visual de AVENTHRA */}
      <path
        d="M16 8.5 L17.7 14.3 L23.5 16 L17.7 17.7 L16 23.5 L14.3 17.7 L8.5 16 L14.3 14.3 Z"
        fill="#ffffff"
        fillOpacity="0.92"
      />
    </svg>
  );
}
