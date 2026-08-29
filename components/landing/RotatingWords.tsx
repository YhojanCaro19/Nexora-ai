// components/landing/RotatingWords.tsx
//
// Palabra que va cambiando en el título de la sección Productos
// (ProductosHero.tsx) — "A 1 click de {más ventas / más tiempo / ...}".
// Inspiración: saleads.ai.
//
// Ritmo pedido por el usuario: la palabra APARECE, se queda ~2 s, se VA, y
// hay un pequeño hueco vacío antes de que aparezca la siguiente (no un
// cross-fade). Color tornasol vía `.aventhra-iridescent` (globals.css).
//
// Las palabras se apilan en la misma celda de un `inline-grid` → el
// contenedor mide siempre lo ancho de la palabra más larga y no hay salto
// de layout. Bajo `prefers-reduced-motion` no rota: muestra la primera y
// queda quieta.
'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const HOLD_MS = 2000; // cuánto se queda visible cada palabra
const GAP_MS = 420; // hueco vacío entre una palabra y la siguiente
const FADE_MS = 340;

export function RotatingWords({ className = '' }: { className?: string }) {
  const t = useTranslations('landing.hero');
  const WORDS = t.raw('words') as string[];
  const wordCount = WORDS.length;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // `visible` e `index` ya arrancan bien (true / 0) para el primer
    // render, así que el efecto solo AGENDA los cambios — nunca hace
    // setState sincrónico en su cuerpo.
    if (prefersReducedMotion) return;

    const timers: number[] = [];
    let cancelled = false;

    const scheduleCycle = () => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setVisible(false); // se va
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setIndex((i) => (i + 1) % wordCount); // cambia durante el hueco
              setVisible(true); // reaparece
              scheduleCycle();
            }, GAP_MS)
          );
        }, HOLD_MS)
      );
    };

    scheduleCycle();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [prefersReducedMotion, wordCount]);

  return (
    <span className={`relative inline-grid align-bottom ${className}`} aria-live="polite">
      {WORDS.map((word, i) => {
        const active = i === index && visible;
        return (
          <span
            key={word}
            aria-hidden={!active}
            className={`col-start-1 row-start-1 aventhra-iridescent ${
              prefersReducedMotion ? '' : 'transition-all ease-out'
            } ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[0.3em]'}`}
            style={prefersReducedMotion ? undefined : { transitionDuration: `${FADE_MS}ms` }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}
