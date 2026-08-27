// components/landing/RobotHead.tsx
//
// Cabeza del robot para la sección Productos (ProductosHero.tsx). Es el
// VIDEO que pasó el usuario (`public/media/robot-head.mp4`).
//
// El video trae un fondo oscuro casi negro. La página de esta sección ya
// es NEGRO PURO (bg-black en ProductosHero), así que el fondo del video
// coincide y no se ve el corte. Encima:
//   1. `object-cover` + `scale` → recorta el "letterbox" del video.
//   2. Máscara radial suave → difumina cualquier borde que quede.
//   3. Resplandor cian/violeta detrás para que la cabeza "flote".
// El color del video NO se toca (se veía muy oscuro con el filtro anterior).
//
// Parallax sutil con el mouse; el video se pausa fuera de viewport.
'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export function RobotHead() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = wrapRef.current;
    if (!el) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const loop = () => {
      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;
      el.style.transform = `translate3d(${current.x * -14}px, ${current.y * -10}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove);
    loop();
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: '200px' }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative h-full w-full will-change-transform">
      {/* Resplandor detrás — la cabeza "flota". */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%] -z-10 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(76,194,232,0.18),rgba(167,139,250,0.12)_45%,transparent_72%)] blur-2xl"
      />
      <video
        ref={videoRef}
        className="h-full w-full scale-[1.12] object-cover [mask-image:radial-gradient(ellipse_78%_78%_at_50%_48%,black_66%,transparent_94%)]"
        src="/media/robot-head.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      />
    </div>
  );
}
