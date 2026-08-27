// components/landing/HomeExperience.tsx
//
// Home de desktop partido en 2 momentos con el patrón "cortina" — scroll
// nativo normal del navegador, sin scroll-jacking ni medición de
// posiciones/interpolación de escala (se probaron y se descartaron antes):
//
//   Momento 1 — `position: fixed`, COMPLETAMENTE ESTÁTICO: nunca se
//   encoge, nunca cambia de escala, nunca viaja a ningún lado. Es el
//   wordmark "AVENTHRA" + tagline "Tu empleado virtual", quieto en el
//   mismo lugar todo el tiempo que sea visible — el fondo negro (gratis,
//   ver Experience.tsx) + el robot 3D bajando por su cable (sin cambios,
//   gobernado aparte por ExperienceProvider/RobotController) completan la
//   Pantalla 1. Los 3 elementos aparecen juntos, sin stagger.
//
//   Un spacer de `100vh` en el flujo normal del documento reserva el
//   espacio visual de la Pantalla 1 — es lo que le da al scroll algo que
//   recorrer antes de que aparezca la Pantalla 2.
//
//   Momento 2 — un bloque NORMAL en el flujo (no fixed, no animado), con
//   su PROPIO fondo oscuro opaco (mismo tono base que ya usa toda la app,
//   `#08090D`), posicionado justo después del spacer. Al scrollear, sube
//   por scroll nativo normal y TAPA COMPLETAMENTE a la Pantalla 1 (que
//   sigue fija detrás, sin haberse movido un píxel) — como si fuera otra
//   página montándose encima. z-10 (contra el z-0 del wordmark fijo)
//   garantiza que la tape de verdad, sin depender de que el navegador
//   decida el orden de pintado entre un elemento `fixed` y uno normal por
//   su cuenta.
//
//   El Navbar de la Pantalla 2 (ScreenTwoNavbar) vive DENTRO del bloque de
//   Momento 2, como primer hijo, `sticky top-0` — sube en flujo normal
//   junto con el resto del contenido desde el instante en que la Pantalla
//   2 empieza a asomar (pedido explícito del usuario: no debe esperar a
//   que la Pantalla 2 cubra el 100% del viewport), y se queda pegado
//   arriba en cuanto llega al borde superior real. Sin gate de opacidad,
//   sin depender de `homeMomentTwoVisible` — eso quedó exclusivo de las
//   estrellas (ver abajo).
//
//   Disparador de `homeMomentTwoVisible` (SOLO apaga estrellas ahora, ya
//   Navbar): se mide en cada scroll si el borde superior del propio
//   bloque de Momento 2 (`getBoundingClientRect().top`) ya llegó o pasó
//   el borde superior de la pantalla (`top <= 0`) — eso es cierto para
//   TODO el rango de scroll desde ese punto en adelante (no solo un
//   instante), que es exactamente "la Pantalla 2 ya cubre el 100% del
//   viewport, no queda ni un resto de la Pantalla 1 alrededor". Mismo
//   criterio para volver a subir MIENTRAS TODAVÍA no se entró del todo:
//   en cuanto `top` vuelve a ser positivo, se revierte. Pero una vez que
//   se entró de verdad a la Pantalla 2 (`hasEnteredScreenTwoRef`), deja de
//   ser reversible — pedido explícito del usuario: "scrollear hacia
//   arriba no debe sacar la pantalla 1" una vez que ya se entró a un
//   módulo. De ahí en más, si el scroll intenta subir por encima de donde
//   arranca la Pantalla 2, se lo frena ahí (`window.scrollTo`) — la
//   Pantalla 1 es un intro de una sola vez, no una sección a la que se
//   pueda volver. (Versión anterior del disparador usaba un sentinel de
//   1px + `useInView` con un `margin` negativo pensado para simular
//   "cubre el 100%" — tenía un bug real: solo quedaba "true" durante un
//   único píxel de scroll, no durante todo el rango. Descartado.)
//
// Exclusivo de mobile/tablet: NADA de esto — page.tsx no monta este
// componente ahí, sigue rindiendo <HeroContent/> solo, una sola pantalla,
// igual que siempre (esa franja ya tiene su propia intro con timers,
// MobileTextIntro + MobileWordmarkScene, ver Experience.tsx).
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { HeroContent } from '@/components/landing/HeroContent';
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';

export function HomeExperience() {
  const { state, actions } = useExperience();
  const prefersReducedMotion = useReducedMotion();

  // 🐛→✅ Antes esto usaba `useInView(sentinelRef, { margin: '0px 0px -100%
  // 0px' })` sobre un sentinel de 1px: la idea era que ese margin negativo
  // reduce el "viewport" del observer a una línea de 0px pegada arriba, así
  // que el sentinel (1px de alto) solo la cruza durante UN PÍXEL de scroll
  // — en cuanto el usuario sigue bajando, el sentinel ya quedó por ENCIMA
  // de esa línea y deja de "estar en vista", así que `screenTwoCovers`
  // volvía a `false` casi de inmediato (bug real, encontrado en vivo
  // inspeccionando el DOM: opacity quedaba en 0 con scrollY bien adentro
  // de la Pantalla 2). Lo que en realidad hace falta es "¿el borde
  // superior de la Pantalla 2 ya llegó o pasó el borde superior de la
  // pantalla?" — eso es cierto para TODO el rango de scroll desde ese
  // punto en adelante, no solo un instante. Se mide directo con
  // `getBoundingClientRect().top` del propio contenedor de la Pantalla 2
  // en cada scroll, sin sentinel aparte.
  const screenTwoRef = useRef<HTMLDivElement>(null);
  // Arranca SIEMPRE en `false`: el Home siempre entra por la Pantalla 1
  // (el intro), y el scroll del usuario es lo único que sube la Pantalla
  // 2. "Productos" ya NO llega acá — es su propia ruta (/productos), como
  // Soluciones/Precios/Clientes — así que no hay ningún caso de "aterrizar
  // directo en los módulos" que haya que resolver con query params.
  const [screenTwoCovers, setScreenTwoCovers] = useState(false);
  // Pedido explícito: una vez que el scroll entra de verdad a la Pantalla
  // 2, volver a scrollear hacia arriba NO debe sacar la Pantalla 1 otra
  // vez — la Pantalla 1 es un intro de una sola vez. `ref` (no state):
  // solo lo lee el propio handler de scroll, no necesita re-render.
  const hasEnteredScreenTwoRef = useRef(false);
  // 🐛→✅ Guarda cuánto medía el spacer justo ANTES de colapsarlo — sin
  // esto, el `useLayoutEffect` de compensación de más abajo no sabría
  // cuánto restarle al scroll para que no se sienta el salto. Se lee UNA
  // sola vez, en el instante exacto en que `covers` pasa a `true` por
  // primera vez (antes de que el estado dispare el re-render que colapsa
  // el spacer), nunca después.
  const collapsedSpacerHeightRef = useRef(0);
  // Guarda el `scrollY` del instante exacto en que `covers` pasa a `true`,
  // en vez de volver a leer `window.scrollY` en el `useLayoutEffect` de
  // compensación: al acortarse el documento (spacer 100vh → 0) el
  // navegador auto-clampea `scrollTop` a `[0, scrollHeight - clientHeight]`
  // por su cuenta, así que para cuando corre la compensación el valor ya
  // puede estar corrompido.
  const scrollYBeforeCollapseRef = useRef(0);

  useEffect(() => {
    // 🐛→✅ Bug real de performance, probablemente la causa de que la
    // estela del botón "Iniciar sesión" se sintiera "tildada"/entrecortada
    // (reportado por el usuario): esta función hacía un
    // `getBoundingClientRect()` (fuerza un recálculo de layout síncrono)
    // en CADA evento `scroll`, sin límite — en un scroll rápido de
    // trackpad eso puede disparar decenas de recálculos por segundo,
    // compitiendo por el hilo principal con cualquier animación CSS de la
    // página (incluida la del anillo). Dos fixes:
    //   1. Una vez que ya se entró a la Pantalla 2 (`hasEnteredScreenTwoRef`
    //      en `true`), el estado ya no puede cambiar (ver el comentario de
    //      esa ref) — no hace falta seguir midiendo NADA en cada scroll,
    //      se corta de una.
    //   2. Mientras todavía no se entró, se limita el trabajo a como mucho
    //      una vez por frame con `requestAnimationFrame` (el patrón
    //      estándar para throttlear handlers de scroll) en vez de una vez
    //      por evento crudo.
    let rafId: number | null = null;

    function measure() {
      rafId = null;
      if (hasEnteredScreenTwoRef.current) return;
      const el = screenTwoRef.current;
      if (!el) return;
      const covers = el.getBoundingClientRect().top <= 0;
      if (covers) {
        collapsedSpacerHeightRef.current = el.offsetTop;
        scrollYBeforeCollapseRef.current = window.scrollY;
        hasEnteredScreenTwoRef.current = true;
      }
      setScreenTwoCovers(covers);
    }

    function onScrollOrResize() {
      if (hasEnteredScreenTwoRef.current) return;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Al colapsar el spacer de 100vh a 0 (ver el JSX del spacer más abajo),
  // el contenido de ARRIBA desaparece de golpe — sin compensar, la página
  // "salta" bruscamente. `useLayoutEffect` (corre SINCRÓNICO después de
  // que React ya aplicó el cambio al DOM, pero ANTES de que el navegador
  // pinte el frame) resta el alto del spacer del scroll que había ANTES
  // de colapsar (`scrollYBeforeCollapseRef`, capturado en `measure()` —
  // ver el comentario grande ahí de por qué NO se vuelve a leer
  // `window.scrollY` acá directamente) — mismo contenido visual, cero
  // salto perceptible, sea cual sea el tamaño del salto que trajo hasta
  // acá (scroll gradual del usuario o un `scrollIntoView` grande).
  const prevScreenTwoCoversRef = useRef(false);
  useLayoutEffect(() => {
    if (screenTwoCovers && !prevScreenTwoCoversRef.current) {
      window.scrollTo(0, scrollYBeforeCollapseRef.current - collapsedSpacerHeightRef.current);
    }
    prevScreenTwoCoversRef.current = screenTwoCovers;
  }, [screenTwoCovers]);

  // 🐛→✅ Dos intentos previos de bloquear "volver a la Pantalla 1" y
  // ambos con problemas reales:
  //   1º intento: corregir DESPUÉS con `window.scrollTo` cada vez que
  //   `scroll` detectaba que ya se había pasado el límite — pelea contra
  //   el scroll por inercia del trackpad (macOS sigue mandando eventos de
  //   scroll de inercia después del gesto real), se sentía como que la
  //   pantalla "vibraba".
  //   2º intento: un listener de `wheel` con `preventDefault()` — mejor en
  //   teoría (frena ANTES de que pase, no corrige después), pero Safari/
  //   macOS no siempre deja cancelar eventos de wheel en fase de inercia
  //   — seguía dejando subir en la práctica (reportado por el usuario:
  //   "solo con Productos puede subir").
  // La solución de verdad no pelea contra el scroll en absoluto: en vez de
  // frenar o corregir, se ACHICA el spacer de 100vh a 0 en cuanto
  // `screenTwoCovers` pasa a `true` (ver el JSX más abajo) — sin espacio
  // que recorrer arriba de la Pantalla 2, el navegador mismo no deja
  // scrollear más arriba de su borde (comportamiento nativo de scroll,
  // nada de JS peleando evento por evento). Como `screenTwoCovers` ya
  // queda en `true` para siempre una vez que se entra (ver `measure()`
  // arriba), el spacer nunca vuelve a crecer solo — solo `resetHomeIntro`
  // (el logo AVENTHRA) lo hace, ver el efecto de abajo.

  useEffect(() => {
    actions.setHomeMomentTwoVisible(screenTwoCovers);
  }, [screenTwoCovers, actions]);

  // Salida explícita de vuelta a la Pantalla 1 — pedido del usuario: "si
  // debe aparecer la Pantalla 1 cuando le dé en AVENTHRA" (el logo de
  // ScreenTwoNavbar.tsx, que llama a `actions.resetHomeIntro()` al
  // clickearlo estando ya en Home). Distinto de scrollear hacia arriba
  // por accidente (bloqueado más arriba): esto es un reset deliberado —
  // desbloquea el ref y vuelve a scrollY 0. `state.homeIntroResetToken`
  // es un contador (no un booleano) para que SIEMPRE dispare este efecto
  // al cambiar, incluso si se pide reset dos veces seguidas.
  //
  // El ref que salta la primera corrida es necesario porque todo
  // `useEffect` se ejecuta una vez al montar, sin importar si la
  // dependencia "cambió" de verdad — el reset real solo debe pasar cuando
  // el token CAMBIA después del montaje (un click real en el logo), nunca
  // en el montaje inicial (ahí forzaría `scrollTo(0,0)` de más).
  const isFirstResetRunRef = useRef(true);
  useEffect(() => {
    if (isFirstResetRunRef.current) {
      isFirstResetRunRef.current = false;
      return;
    }
    hasEnteredScreenTwoRef.current = false;
    setScreenTwoCovers(false);
    window.scrollTo(0, 0);
    // Solo debe reaccionar al token, no re-correr por cambios de otras deps.
  }, [state.homeIntroResetToken]);

  // Reduced motion: nada de scroll-cortina — arranca directo "asentado"
  // (mismo criterio que el resto del proyecto, ver mobileIntro en
  // ExperienceProvider.tsx bajo reduced motion). Navbar + estrellas quedan
  // en su estado final de una, sin depender del scroll.
  useEffect(() => {
    if (!prefersReducedMotion) return;
    actions.setHomeMomentTwoVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReducedMotion]);

  // Al salir del Home hacia otra ruta, siempre deja el estado como estaba
  // antes de esta feature — ExperienceProvider persiste entre rutas (ver
  // app/(experience)/layout.tsx), así que sin este cleanup /login o
  // /contacto podrían heredar el toggle apagado si el usuario navega justo
  // con la Pantalla 2 en foco.
  useEffect(() => {
    return () => actions.setHomeMomentTwoVisible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (prefersReducedMotion) {
    return (
      <>
        <ScreenTwoNavbar />
        <HeroContent />
      </>
    );
  }

  return (
    <>
      {/* Momento 1 — `fixed`, estático, nunca se transforma. z-0: por
          debajo del bloque de Momento 2 (z-10) y del Navbar real (z-50),
          para que al taparlo con scroll no haya ninguna duda de orden de
          pintado. Cuando `screenTwoCovers` es `true` este bloque NO se
          renderiza EN ABSOLUTO (no queda como `opacity-0` en el DOM), así
          que no hay ningún AVENTHRA de Pantalla 1 que se pueda colar. */}
      {!screenTwoCovers && (
        <div
          className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center px-6 text-center"
          aria-hidden
        >
          <div className="flex flex-col items-center">
            <h1 className="aventhra-logo text-6xl tracking-[0.18em] text-white xl:text-7xl">
              AVENTHRA
            </h1>
            {/* Sin `.aventhra-logo` acá a propósito — mismo criterio que el
                logo real (Navbar.tsx) y que MobileTextIntro (Experience.tsx):
                SOLO "AVENTHRA" hereda Space Grotesk, el tagline va con la
                tipografía normal de la app. */}
            <p className="mt-6 text-sm uppercase tracking-[0.35em] text-white/35">
              Tu empleado virtual
            </p>
          </div>
        </div>
      )}

      {/* Spacer — reserva el alto de la Pantalla 1 en el flujo normal del
          documento, así existe algo de scroll real antes de que aparezca
          la Pantalla 2. Se achica a 0 en cuanto `screenTwoCovers` pasa a
          `true` (y se queda así, ver el comentario grande de arriba) —
          sin espacio que recorrer arriba de la Pantalla 2, el navegador
          mismo no deja volver a scrollear hacia la Pantalla 1, sin pelear
          evento por evento. Vuelve a 100vh solo cuando se pide un reset
          explícito (logo AVENTHRA). */}
      <div aria-hidden className={screenTwoCovers ? 'h-0 w-full' : 'h-screen w-full'} />

      {/* Momento 2 — bloque normal (no fixed, no animado): scroll nativo
          normal lo sube y tapa a la Pantalla 1. Fondo propio opaco
          (#08090D, el mismo tono base de toda la app) para taparla de
          verdad, no solo visualmente "encima" sin cubrir. */}
      <div ref={screenTwoRef} className="relative z-10 w-full bg-[#08090D]">
        {/* 🐛→✅ Antes ScreenTwoNavbar vivía FUERA de este bloque, `fixed`
            + gateado por opacidad (aparecía recién cuando `screenTwoCovers`
            era true, es decir cuando la Pantalla 2 ya cubría el 100% del
            viewport) — pedido explícito del usuario: el navbar debe subir
            PEGADO al borde de la Pantalla 2 desde el instante en que
            empieza a asomar, no esperar a que termine de subir. Como
            PRIMER hijo acá adentro (`sticky top-0` en ScreenTwoNavbar.tsx),
            sube en flujo normal junto con el resto del contenido y se
            queda pegado arriba en cuanto llega al borde superior real —
            sin ningún gate de opacidad, siempre visible como parte normal
            de la Pantalla 2. */}
        <ScreenTwoNavbar />
        <HeroContent />
      </div>
    </>
  );
}
