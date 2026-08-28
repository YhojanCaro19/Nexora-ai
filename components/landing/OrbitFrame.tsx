// components/landing/OrbitFrame.tsx
//
// Marco con un BORDE de degradado cónico que gira — el mismo efecto del
// botón "Iniciar sesión" del navbar (clase .nexora-navlogin-orbit,
// globals.css). El truco: un contenedor `overflow-hidden` con padding de
// 1px, un span gigante con el conic-gradient girando detrás, y el
// contenido encima con fondo sólido — el degradado solo asoma en el
// borde. Nada de resplandor hacia adentro: el efecto es SOLO alrededor.
//
// `ringSize` debe cubrir la diagonal del marco para que la luz recorra
// todo el perímetro sin "esquinas muertas".
'use client';

import type { CSSProperties, ReactNode } from 'react';

interface OrbitFrameProps {
  children: ReactNode;
  /** Clases del contenedor externo (display, ancho, rounded, transforms). */
  className?: string;
  /** Clases del contenedor interno (rounded interno + fondo sólido). */
  innerClassName?: string;
  /** Tamaño del span que gira. Grande = cubre la diagonal del marco. */
  ringSize?: string;
  /** Duración de una vuelta (default 1.4s, igual que el botón de login). */
  spinDuration?: string;
}

const CONIC =
  'conic-gradient(from 0deg, #4CC2E8 0%, #A78BFA 45%, #ffffff 50%, #A78BFA 55%, #4CC2E8 100%)';

export function OrbitFrame({
  children,
  className = '',
  innerClassName = '',
  ringSize = 'h-[320px] w-[320px]',
  spinDuration,
}: OrbitFrameProps) {
  const ringStyle: CSSProperties = {
    transform: 'translate(-50%, -50%)',
    background: CONIC,
    ...(spinDuration ? { animationDuration: spinDuration } : null),
  };

  return (
    <span className={`relative overflow-hidden p-px ${className}`}>
      <span
        aria-hidden
        className={`nexora-navlogin-orbit pointer-events-none absolute left-1/2 top-1/2 ${ringSize} will-change-transform`}
        style={ringStyle}
      />
      <span className={`relative z-10 block h-full ${innerClassName}`}>
        {children}
      </span>
    </span>
  );
}
