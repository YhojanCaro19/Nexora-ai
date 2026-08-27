// components/landing/OrbitRing.tsx
//
// Envoltorio reutilizable del efecto "anillo girando alrededor" — pedido
// explícito del usuario, usado en el botón "Iniciar sesión" del navbar de
// Pantalla 2 (ScreenTwoNavbar.tsx) y en la card completa de login
// (app/(experience)/(auth)/login/page.tsx).
//
// Técnica (6 iteraciones hasta llegar acá, cada bug real encontrado y
// corregido en vivo — se deja el historial documentado porque cada una
// parecía razonable hasta que se probó):
//   1º-4º: variantes con un div de fondo (CSS `conic-gradient` rotando o
//   un trazo de SVG con `pathLength`) — problemas de hueco intermitente,
//   soporte inconsistente de `pathLength` en esquinas redondeadas, y un
//   bug real de Tailwind v4 (`translate` como propiedad separada de
//   `transform`, sumándose con la animación).
//   5º: un div de fondo recortado con `mask`/`mask-composite: exclude`
//   (para lograr "solo el borde, nunca rellena el interior" en una card
//   semi-transparente) — bug real y grave de renderizado en Safari:
//   combinar ese `mask` con un `border-radius` grande producía líneas
//   diagonales enormes cruzando toda la pantalla (reportado por el
//   usuario con captura). Es un bug documentado de WebKit con
//   `mask-composite`/esquinas redondeadas grandes, no algo arreglable
//   ajustando valores.
//   6º: SVG con `fill="none"` — por definición, un trazo sin relleno NUNCA
//   puede pintar el interior, sin importar qué combine con qué (a
//   diferencia de cualquier técnica basada en `mask`/`overflow`, que
//   dependen de que el recorte funcione bien). El degradado no es un
//   `conic-gradient` (SVG no tiene un equivalente nativo) sino un
//   `<linearGradient>` que debía rotar alrededor del centro del trazo.
//   🐛→✅ 7º (esta versión): el 6º intento animaba `gradientTransform` con
//   `<animateTransform>` (SMIL) — el elemento SÍ se montaba y la animación
//   SÍ corría en teoría, pero medido en vivo (matriz del degradado
//   muestreada en dos instantes separados por 1 segundo) quedaba
//   CONGELADA, sin avanzar — SMIL animando `gradientTransform`
//   específicamente tiene soporte poco confiable entre navegadores (a
//   diferencia de animar el `transform` de un elemento normal, que sí
//   funciona bien con SMIL). Fix: se abandona SMIL del todo — un
//   `requestAnimationFrame` en React actualiza `gradientTransform`
//   directamente por JS, cuadro a cuadro. Menos "declarativo", pero
//   garantizado: no depende de que el navegador soporte bien un rincón
//   poco común de SMIL.
'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';

const ORBIT_DURATION_MS = 1400;

interface OrbitRingProps {
  children: ReactNode;
  /** Radio de las esquinas en px — debe calzar con el radio real del
   * hijo (ej. 9999 para una píldora — SVG lo satura solo a la mitad del
   * lado más chico, no hace falta saber la altura real; 16 para
   * "rounded-2xl", 8 para "rounded-lg", ver --radius-* en globals.css).
   * Default 9999 (píldora). */
  radius?: number;
  /** Clases extra para el wrapper — típicamente "w-full" cuando el hijo
   * también lo es. */
  className?: string;
}

export function OrbitRing({ children, radius = 9999, className = '' }: OrbitRingProps) {
  const gradientId = useId();
  const prefersReducedMotion = useReducedMotion();
  const gradientRef = useRef<SVGLinearGradientElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    let rafId: number;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = (now - start) % ORBIT_DURATION_MS;
      const angle = (elapsed / ORBIT_DURATION_MS) * 360;
      gradientRef.current?.setAttribute('gradientTransform', `rotate(${angle} 0.5 0.5)`);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [prefersReducedMotion]);

  return (
    <span className={`relative inline-flex ${className}`}>
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient ref={gradientRef} id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4CC2E8" />
            <stop offset="45%" stopColor="#A78BFA" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#4CC2E8" />
          </linearGradient>
        </defs>
        {/* Sin `calc()` en x/y/width/height a propósito (punto frágil
            entre navegadores para atributos SVG, ya probado antes) —
            `100%`/`100%` sin restar el grosor del trazo: el trazo se
            dibuja centrado en el borde así que sobresale ~0.75px hacia
            afuera; `overflow-visible` en el `<svg>` deja ver ese pelín de
            más sin recortarlo, imperceptible en la práctica. */}
        <rect x="0" y="0" width="100%" height="100%" rx={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      </svg>
      <span className="relative z-10 flex w-full">{children}</span>
    </span>
  );
}
