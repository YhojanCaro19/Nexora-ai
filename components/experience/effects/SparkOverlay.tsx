// components/experience/effects/SparkOverlay.tsx
//
// Aproximación 2D/CSS del mismo lenguaje visual que ya usa el robot 3D en
// sus cables (components/experience/scene/cables/CablePulseShader.tsx,
// createSparkOverlayMaterial): destellos blanco-cian cortos, cada uno con
// su propia fase, encendiéndose de forma esporádica — no un shader real
// (eso vive en un ShaderMaterial dentro de un <Canvas> de R3F, que esta
// pieza existe justo para NO tener que montar), sino unos puntos con
// animación CSS pura.
//
// Se eligió CSS puro (@keyframes spark-flash en app/globals.css) en vez de
// <canvas> 2D o un loop de requestAnimationFrame: acá solo hace falta un
// puñado de puntos parpadeando de forma espaciada — eso el navegador ya lo
// resuelve solo, en el compositor, sin JS corriendo de fondo en cada
// frame. Importa sobre todo en el uso persistente del Navbar (vive montado
// en TODA página, no solo los ~2s de la intro): un <canvas> con su propio
// loop de dibujo ahí sería exactamente el tipo de overhead que Fase 1 de
// este trabajo buscaba evitar, solo que reintroducido por otra puerta.
'use client';

import { useEffect, useState } from 'react';

interface Spark {
  id: number;
  top: number;
  left: number;
  cycle: number;
  delay: number;
}

interface SparkOverlayProps {
  /** Cantidad de chispas. */
  count?: number;
  /** Tamaño de cada chispa en px. */
  size?: number;
  /** Cada chispa completa su propio ciclo (mayormente "apagada", con un
   * flash breve cerca del final) en un tiempo aleatorio dentro de este
   * rango — rangos más largos = chispeo más espaciado/sutil. */
  minCycleSeconds?: number;
  maxCycleSeconds?: number;
  color?: string;
  className?: string;
}

export function SparkOverlay({
  count = 5,
  size = 4,
  minCycleSeconds = 2.4,
  maxCycleSeconds = 5,
  color = '#eaffff',
  className = '',
}: SparkOverlayProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  // Math.random() vive DENTRO del efecto (nunca durante el render, que
  // debe ser puro) — como efecto, solo corre en cliente, así que de paso
  // nunca produce un valor distinto entre servidor y cliente: no hace
  // falta ningún gate de hidratación aparte para esto en particular. El
  // setState va diferido en un setTimeout(0) (no sincrónico dentro del
  // cuerpo del efecto) — mismo patrón ya usado en QualityProvider.tsx y
  // MobileIntro.tsx para no disparar el lint react-hooks/set-state-in-effect.
  useEffect(() => {
    const generated: Spark[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      top: 6 + Math.random() * 82,
      left: 4 + Math.random() * 90,
      cycle: minCycleSeconds + Math.random() * (maxCycleSeconds - minCycleSeconds),
      // Delay negativo: cada chispa arranca ya a mitad de su propio ciclo
      // en vez de las N sincronizadas en el frame 0 — se ven desfasadas
      // desde el primer instante, no recién "con el tiempo".
      delay: -Math.random() * maxCycleSeconds,
    }));
    const t = setTimeout(() => setSparks(generated), 0);
    return () => clearTimeout(t);
  }, [count, minCycleSeconds, maxCycleSeconds]);

  if (sparks.length === 0) return null;

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      {sparks.map((s) => (
        <span
          key={s.id}
          className="spark-dot absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: size,
            height: size,
            background: color,
            boxShadow: `0 0 ${size * 2.5}px ${size * 0.7}px ${color}`,
            animationDuration: `${s.cycle}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
