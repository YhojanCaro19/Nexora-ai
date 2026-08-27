// components/landing/SectionDots.tsx
//
// Río de puntitos que dibuja un TRAZO CURVO grande y suave (estilo garabato
// de firma), para el lado del texto de la sección Productos
// (ProductosHero.tsx). Inspiración: los fondos de puntos de saleads.ai.
//
//   - La curva es un spline Catmull-Rom (suave de verdad, sin quiebres) que
//     pasa por unos puntos de control, y esos puntos ONDULAN lento → el
//     trazo entero se mueve un poco.
//   - Miles de partículas viven sobre la curva con una dispersión
//     perpendicular (una "brocha" de puntos, no una línea de 1px), cada una
//     con su brillo y su parpadeo.
//   - Al pasar el cursor, las partículas cercanas se encienden + un halo
//     que sigue al mouse.
//
// Canvas 2D. Sin imagen ni asset externo. Se pausa fuera de viewport; bajo
// `prefers-reduced-motion` no ondula ni reacciona al mouse (queda quieto).
'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface SectionDotsProps {
  className?: string;
}

const MOUSE_RADIUS = 240;
const DISTORT = 62; // px que empuja el mouse a las partículas cercanas
const DISTORT_EASE = 0.14; // qué tan rápido vuelven a su sitio (0..1)

// Puntos de control del trazo (normalizados 0..1, y hacia abajo). Curva
// grande y fluida con MUCHAS lomas, tipo cursiva enredada.
const CONTROL: number[][] = [
  [0.02, 0.2], [0.1, 0.04], [0.2, 0.15], [0.13, 0.33], [0.24, 0.43],
  [0.15, 0.59], [0.27, 0.69], [0.19, 0.87], [0.35, 0.96], [0.46, 0.79],
  [0.37, 0.6], [0.48, 0.46], [0.39, 0.29], [0.52, 0.15], [0.45, 0.03],
  [0.6, 0.02], [0.71, 0.18], [0.62, 0.38], [0.75, 0.5], [0.66, 0.68],
  [0.81, 0.79], [0.72, 0.93], [0.89, 0.9], [0.95, 0.68],
];

function catmull(p0: number, p1: number, p2: number, p3: number, f: number) {
  const f2 = f * f;
  const f3 = f2 * f;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * f +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * f3)
  );
}

export function SectionDots({ className = '' }: SectionDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const mouse = { x: -9999, y: -9999 };
    let raf = 0;
    let running = false;
    let w = 0;
    let h = 0;

    // Encaje del trazo: ocupa TODO el ancho del contenedor (llega hasta el
    // borde izquierdo); si por eso se pasa de alto, arriba/abajo se
    // recortan y las máscaras del contenedor los difuminan.
    let sx = 1;
    let sy = 1;
    let ox = 0;
    let oy = 0;
    const setFit = () => {
      const xs = CONTROL.map((p) => p[0]);
      const ys = CONTROL.map((p) => p[1]);
      const bw = Math.max(...xs) - Math.min(...xs);
      const bh = Math.max(...ys) - Math.min(...ys);
      const fill = 1.04;
      const dw = w * fill;
      const dh = dw * (bh / bw);
      sx = dw / bw;
      sy = dh / bh;
      ox = (w - dw) / 2 - Math.min(...xs) * sx;
      oy = (h - dh) / 2 - Math.min(...ys) * sy;
    };

    // Partículas: posición sobre la curva (s) + desplazamiento perpendicular
    // (off) + rasgos propios. Cantidad proporcional al área.
    type P = {
      s: number;
      off: number;
      bri: number;
      size: number;
      tw: number;
      tws: number;
      dx: number; // desplazamiento actual por el mouse (se relaja a 0)
      dy: number;
    };
    let particles: P[] = [];
    const buildParticles = () => {
      const count = Math.max(1200, Math.min(4600, Math.round((w * h) / 470)));
      particles = new Array(count);
      for (let i = 0; i < count; i++) {
        // Dispersión perpendicular concentrada cerca del centro del trazo.
        const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
        particles[i] = {
          s: Math.random(),
          off: g * 2, // -1..1 aprox, en "unidades de banda"
          bri: 0.28 + Math.random() * 0.72,
          size: 0.55 + Math.random() * 1.05,
          tw: Math.random() * Math.PI * 2,
          tws: 0.5 + Math.random() * 1.8,
          dx: 0,
          dy: 0,
        };
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setFit();
      buildParticles();
    };

    // Evalúa la curva animada en s∈[0,1] → punto y tangente (en px).
    const evalCurve = (s: number, time: number) => {
      const n = CONTROL.length;
      const t = s * (n - 1);
      const i = Math.min(Math.floor(t), n - 2);
      const f = t - i;
      const get = (k: number) => {
        const c = CONTROL[Math.max(0, Math.min(n - 1, k))];
        const wob = prefersReducedMotion ? 0 : 1;
        // Cada punto de control ondula con su propia fase/frecuencia.
        const ax = Math.sin(time * 0.00035 + k * 1.7) * 0.022 * wob;
        const ay = Math.cos(time * 0.00028 + k * 2.3) * 0.02 * wob;
        return [(c[0] + ax) * sx + ox, (c[1] + ay) * sy + oy];
      };
      const p0 = get(i - 1);
      const p1 = get(i);
      const p2 = get(i + 1);
      const p3 = get(i + 2);
      const x = catmull(p0[0], p1[0], p2[0], p3[0], f);
      const y = catmull(p0[1], p1[1], p2[1], p3[1], f);
      const e = 0.004;
      const fe = Math.min(1, f + e);
      const x2 = catmull(p0[0], p1[0], p2[0], p3[0], fe);
      const y2 = catmull(p0[1], p1[1], p2[1], p3[1], fe);
      let tx = x2 - x;
      let ty = y2 - y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      return { x, y, nx: -ty, ny: tx };
    };

    const BAND = () => Math.max(14, Math.min(w, h) * 0.12); // ancho de la brocha (dispersión)

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      const band = BAND();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const c = evalCurve(p.s, time);
        const baseX = c.x + c.nx * p.off * band;
        const baseY = c.y + c.ny * p.off * band;

        const twinkle = prefersReducedMotion
          ? 1
          : 0.72 + Math.sin(p.tw + time * 0.002 * p.tws) * 0.28;
        // Se atenúa un poco hacia los bordes de la banda (pero no
        // desaparece — se quiere ver disperso).
        const edge = 1 - Math.min(1, Math.abs(p.off) * 0.8);
        const alpha = p.bri * twinkle * (0.42 + edge * 0.58) * 0.85;
        let bright = 0.15 + edge * 0.45;

        // DISTORSIÓN: el mouse empuja las partículas hacia afuera + un
        // poco de giro (remolino). El desplazamiento se relaja de vuelta a
        // 0 solo, así el trazo "fluye" cuando pasa el cursor, no se
        // teletransporta.
        let targetDx = 0;
        let targetDy = 0;
        if (mouse.x > -9000) {
          const mx = baseX + p.dx - mouse.x;
          const my = baseY + p.dy - mouse.y;
          const d = Math.hypot(mx, my);
          if (d < MOUSE_RADIUS) {
            const f = 1 - d / MOUSE_RADIUS;
            const push = f * f * DISTORT;
            const inv = 1 / (d || 1);
            let ux = mx * inv;
            let uy = my * inv;
            // Remolino: rota el vector de empuje un poco.
            const swirl = f * 0.9;
            const cs = Math.cos(swirl);
            const sn = Math.sin(swirl);
            [ux, uy] = [ux * cs - uy * sn, ux * sn + uy * cs];
            targetDx = ux * push;
            targetDy = uy * push;
            bright = Math.min(1, bright + f * f * 0.55);
          }
        }
        p.dx += (targetDx - p.dx) * DISTORT_EASE;
        p.dy += (targetDy - p.dy) * DISTORT_EASE;

        const x = baseX + p.dx;
        const y = baseY + p.dy;

        if (alpha <= 0.02) continue;
        const r = 70 + bright * 120;
        const g = 120 + bright * 110;
        const b = 240 + bright * 15;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (time: number) => {
      draw(time);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    start();

    const onResize = () => resize();
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    // Pausa si la pestaña queda oculta (este fondo va en varias páginas y
    // muchas veces es `fixed`, siempre "en viewport").
    let visible = true;
    let inView = true;
    const sync = () => (visible && inView ? start() : stop());
    const onVisibility = () => {
      visible = !document.hidden;
      sync();
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseout', onLeave);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { rootMargin: '120px' }
    );
    io.observe(canvas);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} aria-hidden className={`h-full w-full ${className}`} />;
}
