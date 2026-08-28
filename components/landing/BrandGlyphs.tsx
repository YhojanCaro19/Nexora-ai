// components/landing/BrandGlyphs.tsx
//
// Glyphs SVG SIMPLIFICADOS y a color de las marcas que AVENTHRA integra
// (redes y plataformas de anuncios). Reproducciones propias y minimalistas
// para filas de "integra con" / "publica en" — viewBox 24×24, colores de
// marca aproximados. NO son los assets oficiales; si se necesita fidelidad
// exacta, reemplazar por los brand kits oficiales.
//
// Uso nominativo (indicar compatibilidad); no implican patrocinio ni
// alianza con Meta, Google ni TikTok.
import type { SVGProps } from 'react';

type GlyphProps = SVGProps<SVGSVGElement>;

const svgBase = {
  viewBox: '0 0 24 24',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;

export function WhatsAppGlyph(props: GlyphProps) {
  return (
    <svg {...svgBase} {...props}>
      <path
        fill="#25D366"
        d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Z"
      />
      <path
        fill="#fff"
        d="M9 7.7c-.2-.4-.3-.4-.5-.4h-.5c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3 4.8 4.2 2.4 1 2.9.8 3.4.8s1.7-.7 1.9-1.3c.2-.7.2-1.2.2-1.3l-.5-.4-2-1c-.3-.1-.5-.2-.7.1l-.7.9c-.1.2-.3.2-.5.1s-1.1-.4-2.2-1.4c-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.5.1-.2 0-.3 0-.5L9 7.7Z"
      />
    </svg>
  );
}

export function InstagramGlyph(props: GlyphProps) {
  return (
    <svg {...svgBase} {...props}>
      <defs>
        <linearGradient id="aventhra-ig" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#F9CE34" />
          <stop offset="0.5" stopColor="#EE2A7B" />
          <stop offset="1" stopColor="#6228D7" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5.4"
        fill="none"
        stroke="url(#aventhra-ig)"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="url(#aventhra-ig)"
        strokeWidth="2"
      />
      <circle cx="17.2" cy="6.8" r="1.3" fill="url(#aventhra-ig)" />
    </svg>
  );
}

export function FacebookGlyph(props: GlyphProps) {
  return (
    <svg {...svgBase} {...props}>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.5 21.9v-7H16l.4-2.9h-2.9V9.9c0-.8.4-1.6 1.7-1.6h1.3V5.7s-1.2-.2-2.3-.2c-2.3 0-3.8 1.4-3.8 4v2.5H7.9v2.9h2.4v7c.5.1 1.1.1 1.7.1s1.1 0 1.6-.1Z"
      />
    </svg>
  );
}

export function TikTokGlyph(props: GlyphProps) {
  return (
    <svg {...svgBase} {...props}>
      <path
        fill="#25F4EE"
        d="M15 3c.4 2.3 1.7 3.9 4 4.1v3c-1.5 0-2.9-.4-4.1-1.2v6.3A6.1 6.1 0 1 1 8.8 9.1c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.1-.9-.1a3 3 0 1 0 3 3V3H15Z"
      />
      <path
        fill="#FE2C55"
        d="M16 4c.4 2.3 1.7 3.9 4 4.1v3c-1.5 0-2.9-.4-4.1-1.2v6.3a6.1 6.1 0 1 1-6.1-6.1c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.1-.9-.1a3 3 0 1 0 3 3V4H16Z"
      />
      <path
        fill="#fff"
        d="M15.5 3.5c.4 2.3 1.7 3.9 4 4.1v3c-1.5 0-2.9-.4-4.1-1.2v6.3a6.1 6.1 0 1 1-6.1-6.1c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.1-.9-.1a3 3 0 1 0 3 3V3.5h3.3Z"
      />
    </svg>
  );
}

export function MetaGlyph(props: GlyphProps) {
  return (
    <svg {...svgBase} {...props}>
      <path
        fill="none"
        stroke="#0866FF"
        strokeWidth="2.4"
        strokeLinecap="round"
        d="M12 12c1.7-2.5 3.1-3.7 4.7-3.7 2.1 0 3.5 1.7 3.5 3.7s-1.4 3.7-3.5 3.7c-1.6 0-3-1.2-4.7-3.7Zm0 0c-1.7 2.5-3.1 3.7-4.7 3.7C5.2 15.7 3.8 14 3.8 12s1.4-3.7 3.5-3.7C8.9 8.3 10.3 9.5 12 12Z"
      />
    </svg>
  );
}

export function GoogleGlyph(props: GlyphProps) {
  return (
    <svg {...svgBase} {...props}>
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3l3.2 2.5c1.9-1.7 3-4.3 3-7.2Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.3 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.3-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3 7.5l3.3 2.6C7.1 7.8 9.4 6.1 12 6.1Z"
      />
    </svg>
  );
}
