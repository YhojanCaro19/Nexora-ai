// components/landing/Counter.tsx
//
// Número que cuenta desde 0 hasta `to` cuando entra al viewport (una sola
// vez). Para las secciones de estadísticas de la landing. Bajo
// `prefers-reduced-motion` muestra el valor final de una.
'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface CounterProps {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
}

export function Counter({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 1400,
  className = '',
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let started = false;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(to * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        io.disconnect();
        // setState acá (callback del observer, no en el cuerpo del efecto).
        if (prefersReducedMotion) setValue(to);
        else run();
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, durationMs, prefersReducedMotion]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString('es-CO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
