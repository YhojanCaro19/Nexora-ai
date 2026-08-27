// components/landing/OrbitButton.tsx
//
// Botón oscuro con un BORDE de degradado fino y estático (cian → violeta).
// Técnica: un contenedor con el degradado de fondo + `p-px`, y adentro la
// píldora de fondo sólido — el degradado solo asoma en 1px de borde. Sin
// `mask-composite` (rompe en Safari, ya visto en este proyecto) y sin
// anillo cónico girando (llenaba el botón de color — pedido del usuario:
// "no quiero que se llene así").
//
// El hover NO lo llena de color: el interior sigue oscuro, solo el texto
// pasa a blanco pleno y aparece un resplandor suave alrededor.
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface OrbitButtonProps {
  href: string;
  children: ReactNode;
  /** Clases extra para el contenedor (ej. márgenes). */
  className?: string;
}

export function OrbitButton({ href, children, className = '' }: OrbitButtonProps) {
  return (
    <span
      className={`group inline-block rounded-full bg-[linear-gradient(120deg,#4CC2E8,#A78BFA_55%,#4CC2E8)] p-px transition-shadow duration-300 hover:shadow-[0_0_28px_-4px_rgba(129,140,248,0.45)] ${className}`}
    >
      <Link
        href={href}
        className="flex w-fit items-center gap-2 rounded-full bg-[#0b0b0f] px-7 py-3 text-sm font-medium text-white/80 transition-colors duration-300 group-hover:text-white"
      >
        {children}
      </Link>
    </span>
  );
}
