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

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface LandingVideoProps {
  /** Fuente única. Alternativa a `sources` (uno u otro). */
  src?: string;
  /** Varias fuentes en orden de preferencia — para video con canal alfa
   * real: `.webm` VP9 (Chrome/Firefox) + `.mov` HEVC (Safari). El navegador
   * elige la primera que soporta. */
  sources?: { src: string; type: string }[];
  /** Fuerza del parallax en px (default 14). */
  parallax?: number;
  /** `cover` (default) recorta para llenar; `contain` muestra el video
   * entero (para wordmarks/animaciones anchas que no se pueden recortar). */
  fit?: 'cover' | 'contain';
  /** `screen` "elimina" el fondo NEGRO del video sobre fondos oscuros
   * (negro → transparente); apaga también el resplandor y la máscara.
   * Default `normal`. */
  blend?: 'normal' | 'screen' | 'lighten';
  /** El video ya trae canal alfa (fondo recortado): sin resplandor, sin
   * máscara radial, sin blend — se muestra tal cual, flotando. */
  chromeless?: boolean;
  /** Arranca invisible y aparece con un fundido corto recién cuando el
   * navegador presenta el PRIMER fotograma de verdad (requestVideoFrame
   * callback; fallback `playing`) — así nunca se ve el primer fotograma
   * congelado ni el recuadro negro mientras arranca el autoplay. */
  revealOnPlay?: boolean;
  /** Solo con `revealOnPlay` + `blend='screen'`: puerta externa para no
   * revelar hasta que el contenedor terminó su animación de entrada. Un
   * ancestro con `opacity < 1` AÍSLA el `mix-blend-mode`, y ahí el fondo
   * negro del video se ve como recuadro. `undefined` = sin puerta. */
  blendReady?: boolean;
  /** Imagen de respaldo (primer fotograma) — se ve si el navegador bloquea
   * el autoplay: robot quieto en vez de un botón nativo de "reproducir". */
  poster?: string;
}

export function LandingVideo({
  src,
  sources,
  parallax = 14,
  fit = 'cover',
  blend = 'normal',
  chromeless = false,
  revealOnPlay = false,
  blendReady,
  poster,
}: LandingVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();
  // `sawFrame`: el navegador ya presentó un fotograma real del video.
  const [sawFrame, setSawFrame] = useState(!revealOnPlay);

  const isBlend = blend !== 'normal';
  const bare = isBlend || chromeless;
  // Puerta de entrada: un ancestro con `opacity < 1` aísla el `mix-blend-mode`
  // y el negro se ve como recuadro; no mostramos nada (ni video ni póster)
  // hasta que asiente.
  const gateOpen = blendReady ?? true;
  // Visible cuando hay fotograma real Y la puerta está abierta.
  const revealed = sawFrame && gateOpen;
  // Póster: se ve el robot quieto mientras el video todavía no pinta un
  // fotograma — incluido el caso en que el navegador BLOQUEA el autoplay
  // (Modo de bajo consumo, Safari con autoplay en "Nunca", iOS Simulator).
  // Así nunca se ve el botón nativo de "reproducir" ni un hueco negro:
  // en el peor caso se ve una imagen fija del robot, que para un elemento
  // decorativo es aceptable. En cuanto el video corre, se funde encima.
  const posterVisible = !!poster && gateOpen && !sawFrame;

  useEffect(() => {
    // En modo `bare` (blend/chromeless) NO se aplica parallax: cualquier
    // `transform` o `will-change` en el contenedor crea un contexto de
    // apilamiento que aislaría el `mix-blend-mode` del video (el negro se
    // quedaría negro). El robot flotante no necesita parallax.
    if (prefersReducedMotion || bare) return;
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
  }, [prefersReducedMotion, parallax, bare]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let raf = 0;
    let pumpRaf = 0;
    let isPlaying = false;
    // Re-arranca el video pase lo que pase. Se llama en `pause`, al volver
    // de un tab en background, cuando el navegador lo deja listo, en el
    // primer gesto del usuario, y periódicamente por si lo detuvo sin
    // emitir evento (Energy Saver de Chrome, política de autoplay, etc.).
    const kick = () => {
      if (!video.paused && !video.ended) return;
      // React NO siempre pone `muted` como propiedad del DOM antes de que
      // el navegador evalúe el autoplay — bug conocido. Sin `muted` real,
      // la política de autoplay bloquea el play() hasta un gesto. Se
      // reafirma en cada intento.
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    // Arranque agresivo: al entrar a la ruta el hilo principal está
    // ocupado (hidratación de Next + los <Canvas> de estrellas), así que
    // un único `play()` inicial se "pierde" y el video se ve congelado 1-2
    // s hasta que el watchdog de 1 s lo agarra. Reintentar en CADA frame
    // hasta que el evento `playing` confirme que corre de verdad.
    const pump = () => {
      if (isPlaying) return;
      kick();
      pumpRaf = requestAnimationFrame(pump);
    };

    const onPause = () => {
      isPlaying = false;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(kick);
      pump();
    };
    const onVisibility = () => {
      if (!document.hidden) kick();
    };
    // `playing` frena el pump (ya corre) pero NO revela: puede dispararse
    // antes de que haya un fotograma pintado. La revelación real va contra
    // el primer fotograma presentado (abajo).
    const onPlaying = () => {
      isPlaying = true;
      cancelAnimationFrame(pumpRaf);
    };

    // Primer fotograma REAL en pantalla → recién ahí se revela (fundido).
    // `requestVideoFrameCallback` es el momento exacto; si no existe
    // (Safari viejo), cae a `timeupdate` con currentTime > 0.
    type RVFCVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    const rvfcVideo = video as RVFCVideo;
    const onTimeUpdate = () => {
      if (video.currentTime > 0) setSawFrame(true);
    };
    if (typeof rvfcVideo.requestVideoFrameCallback === 'function') {
      rvfcVideo.requestVideoFrameCallback(() => setSawFrame(true));
    } else {
      video.addEventListener('timeupdate', onTimeUpdate);
    }

    video.addEventListener('pause', onPause);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('ended', kick);
    video.addEventListener('canplay', kick);
    video.addEventListener('loadeddata', kick);
    video.addEventListener('loadedmetadata', kick);
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
    pump();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pumpRaf);
      window.clearInterval(interval);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('ended', kick);
      video.removeEventListener('canplay', kick);
      video.removeEventListener('loadeddata', kick);
      video.removeEventListener('loadedmetadata', kick);
      video.removeEventListener('timeupdate', onTimeUpdate);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', kick);
      window.removeEventListener('pageshow', kick);
      gestureEvents.forEach((ev) => window.removeEventListener(ev, onGesture));
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`pointer-events-none relative h-full w-full ${
        bare ? '' : 'will-change-transform'
      }`}
    >
      {!bare && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[8%] -z-10 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(76,194,232,0.18),rgba(167,139,250,0.12)_45%,transparent_72%)] blur-2xl"
        />
      )}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          className={`pointer-events-none absolute inset-0 h-full w-full ${
            fit === 'cover' ? 'scale-[1.12] object-cover' : 'object-contain'
          }`}
          style={{
            ...(isBlend ? { mixBlendMode: blend } : null),
            opacity: posterVisible ? 1 : 0,
            transition: 'opacity 220ms ease-out',
          }}
        />
      )}
      <video
        ref={(node) => {
          videoRef.current = node;
          // Primer intento de reproducción en cuanto el nodo existe —
          // antes incluso de que corra el efecto de arriba. Se fija
          // `muted` como PROPIEDAD (React a veces no lo hace a tiempo y sin
          // eso el autoplay silenciado queda bloqueado hasta un gesto).
          if (node) {
            node.muted = true;
            node.defaultMuted = true;
            node.playsInline = true;
            const p = node.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
        }}
        style={{
          ...(isBlend ? { mixBlendMode: blend } : null),
          ...(revealOnPlay
            ? { opacity: revealed ? 1 : 0, transition: 'opacity 220ms ease-out' }
            : null),
        }}
        className={`landing-video pointer-events-none h-full w-full ${
          bare
            ? ''
            : '[mask-image:radial-gradient(ellipse_80%_80%_at_50%_48%,black_66%,transparent_95%)]'
        } ${fit === 'cover' ? 'scale-[1.12] object-cover' : 'object-contain'}`}
        {...(src ? { src } : {})}
        {...({ 'webkit-playsinline': 'true', 'x-webkit-airplay': 'deny' } as Record<string, string>)}
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
      >
        {sources?.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </video>

      {/* El botón grande de "reproducir" que Chrome/Safari dibujan encima
          del video cuando el autoplay silenciado se bloquea o el navegador
          lo pausa (Energy Saver). No queremos que aparezca NUNCA: el video
          es decorativo y se re-arranca solo desde el efecto de arriba. */}
      <style jsx global>{`
        .landing-video::-webkit-media-controls,
        .landing-video::-webkit-media-controls-enclosure,
        .landing-video::-webkit-media-controls-panel,
        .landing-video::-webkit-media-controls-overlay-enclosure,
        .landing-video::-webkit-media-controls-overlay-play-button,
        .landing-video::-webkit-media-controls-start-playback-button,
        .landing-video::-webkit-media-controls-play-button {
          display: none !important;
          -webkit-appearance: none !important;
          appearance: none !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
}
