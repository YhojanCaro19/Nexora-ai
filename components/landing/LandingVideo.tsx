// components/landing/LandingVideo.tsx
//
// Video decorativo de las secciones de la landing. Mismo tratamiento para
// todos (cabeza del robot en Productos, loop de marca en Soluciones, etc.):
//   1. `object-cover` + `scale` → recorta el "letterbox" del video.
//   2. Máscara radial suave → difumina el borde contra el fondo negro.
//   3. Resplandor cian/violeta detrás para que "flote".
//   4. Parallax sutil con el mouse.
//   5. NUNCA se pausa. Es puramente decorativo: si el navegador lo pausa
//      (cambio de sección, tab en background, "Now Playing" del SO, etc.)
//      se re-arranca solo de inmediato. Sin overlay de play nativo.
//
// El color del video no se toca. Pensado para fondo NEGRO PURO (las
// secciones de la landing lo son).
'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface LandingVideoProps {
  src: string;
  /** Fuerza del parallax en px (default 14). */
  parallax?: number;
  /** `cover` (default) recorta para llenar; `contain` muestra el video
   * entero (para wordmarks/animaciones anchas que no se pueden recortar). */
  fit?: 'cover' | 'contain';
}

export function LandingVideo({ src, parallax = 14, fit = 'cover' }: LandingVideoProps) {
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
      el.style.transform = `translate3d(${current.x * -parallax}px, ${
        current.y * -parallax * 0.72
      }px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove);
    loop();
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [prefersReducedMotion, parallax]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let raf = 0;
    // Re-arranca el video pase lo que pase. Se llama en `pause`, al volver
    // de un tab en background, cuando el navegador lo deja listo, en el
    // primer gesto del usuario, y periódicamente por si lo detuvo sin
    // emitir evento (Energy Saver de Chrome, política de autoplay, etc.).
    const kick = () => {
      if (!video.paused && !video.ended) return;
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    const onPause = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(kick);
    };
    const onVisibility = () => {
      if (!document.hidden) kick();
    };

    video.addEventListener('pause', onPause);
    video.addEventListener('ended', kick);
    video.addEventListener('canplay', kick);
    video.addEventListener('loadeddata', kick);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', kick);
    window.addEventListener('pageshow', kick);

    // Cualquier gesto del usuario desbloquea el autoplay silenciado de
    // forma permanente: a partir del primero, `play()` nunca vuelve a ser
    // rechazado, así que el botón nativo de "reproducir" no reaparece.
    const gestureEvents = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel'] as const;
    const onGesture = () => kick();
    gestureEvents.forEach((ev) =>
      window.addEventListener(ev, onGesture, { passive: true })
    );

    const interval = window.setInterval(kick, 1000);
    kick();

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', kick);
      video.removeEventListener('canplay', kick);
      video.removeEventListener('loadeddata', kick);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', kick);
      window.removeEventListener('pageshow', kick);
      gestureEvents.forEach((ev) => window.removeEventListener(ev, onGesture));
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none relative h-full w-full will-change-transform">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%] -z-10 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(76,194,232,0.18),rgba(167,139,250,0.12)_45%,transparent_72%)] blur-2xl"
      />
      <video
        ref={videoRef}
        className={`landing-video pointer-events-none h-full w-full [mask-image:radial-gradient(ellipse_80%_80%_at_50%_48%,black_66%,transparent_95%)] ${
          fit === 'cover' ? 'scale-[1.12] object-cover' : 'object-contain'
        }`}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
        tabIndex={-1}
        aria-hidden
      />

      {/* El botón grande de "reproducir" que Chrome/Safari dibujan encima
          del video cuando el autoplay silenciado se bloquea o el navegador
          lo pausa (Energy Saver). No queremos que aparezca NUNCA: el video
          es decorativo y se re-arranca solo desde el efecto de arriba. */}
      <style jsx global>{`
        .landing-video::-webkit-media-controls-start-playback-button,
        .landing-video::-webkit-media-controls-overlay-play-button,
        .landing-video::-webkit-media-controls-play-button,
        .landing-video::-webkit-media-controls-panel,
        .landing-video::-webkit-media-controls {
          display: none !important;
          -webkit-appearance: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
}
