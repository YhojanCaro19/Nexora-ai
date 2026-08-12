// components/landing/FocusGlowCard.tsx
'use client';

import { useState } from 'react';

interface FocusGlowCardProps {
  children: React.ReactNode;
  className?: string;
  /** Clase de escala en reposo, ej. "scale-100" o "scale-[1.2]" (login la
   * pidió 20% más grande de base). */
  baseScaleClass?: string;
  /** Clase de escala mientras el efecto está activo. Si la base ya es
   * mayor a 100% (login), este valor debe incluir ese extra (ej. la base
   * es 1.2 y el activo 1.26 = 1.2 × 1.05), porque los transforms de
   * Tailwind se reemplazan entre sí, no se multiplican. */
  activeScaleClass?: string;
}

// Elementos que cuentan como "tocar un campo del formulario".
const FORM_FIELD_TAGS = new Set(['INPUT', 'TEXTAREA']);

// Efecto "spotlight": se activa con el CLIC real del usuario sobre un campo
// del formulario, y se apaga al sacar el mouse de la card.
//
// No usamos "focus" para activarlo: Safari, cuando reconoce un formulario
// de login y tiene una contraseña guardada en Keychain, enfoca el campo de
// correo automáticamente apenas carga la página — sin que el usuario haga
// nada. Escuchando "focus" el efecto se disparaba solo, apenas se navegaba
// al login. mousedown en cambio solo ocurre con un clic real.
export const FocusGlowCard = ({
  children,
  className = '',
  baseScaleClass = 'scale-100',
  activeScaleClass = 'scale-105',
}: FocusGlowCardProps) => {
  const [active, setActive] = useState(false);

  return (
    <div
      // w-full: este wrapper es hijo de un contenedor flex — sin ancho
      // propio se encoge a su contenido, y el hijo de adentro (con
      // max-w-xl/max-w-sm + w-full) no puede resolver su porcentaje contra
      // un padre sin ancho definido. Sin esto la card se ve chica.
      className="w-full"
      onMouseDown={(e) => {
        if (FORM_FIELD_TAGS.has((e.target as HTMLElement).tagName)) setActive(true);
      }}
      onMouseLeave={() => setActive(false)}
    >
      <div
        className={`pointer-events-none fixed inset-0 z-0 transition-all duration-500 ${
          active ? 'bg-black/40 backdrop-blur-md' : 'bg-black/0 backdrop-blur-none'
        }`}
      />
      <div
        className={`relative z-10 transition-transform duration-500 ${
          active ? activeScaleClass : baseScaleClass
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
