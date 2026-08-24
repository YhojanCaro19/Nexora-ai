'use client';

import React, { useEffect, useState } from 'react';
import { ExperienceProvider, useExperience } from './providers/ExperienceProvider';
import { MouseProvider } from './providers/MouseProvider';
import { QualityProvider } from './providers/QualityProvider';
import { SceneContainer } from '@/components/experience/scene/SceneContainer';
import { MobileSceneContainer } from '@/components/experience/scene/MobileSceneContainer';
import { Navbar } from '@/components/landing/Navbar';
import { useViewportTier } from '@/core/hooks/useQuality';

export const Experience = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // El robot 3D real (SceneContainer/<Canvas>) queda SOLO para desktop
  // (>=1024px, breakpoint "lg"). Mobile y tablet tienen su PROPIA escena
  // 3D persistente (MobileSceneContainer → MobileWordmarkScene: el
  // wordmark completo aparece de golpe centrado en pantalla y sube a su
  // lugar final, y de ahí en adelante queda flotando como estado
  // permanente con chispas — ver ese archivo para el detalle).
  // useViewportTier() resuelve el valor real de cliente recién después de
  // hidratar (useSyncExternalStore), así que acá no hace falta ningún
  // gate manual de "mounted": no hay mismatch servidor/cliente que evitar
  // a mano.
  const tier = useViewportTier();
  const showRobot3D = tier === 'desktop';

  return (
    <QualityProvider>
      <MouseProvider>
        <ExperienceProvider>
          {/* 🐛 Fix de un bug real y específico de Safari/WKWebView en iOS
              (no reproducible en Chromium ni en WebKit de escritorio, por
              eso las pruebas automatizadas no lo detectaban): position:
              fixed dentro de un ancestro con overflow-hidden deja de
              anclarse al viewport real en iOS y pasa a ser relativo a ese
              ancestro. <Navbar/> usa fixed top-0/bottom-0 — antes vivía
              DENTRO del div con overflow-hidden de más abajo, junto a los
              fondos y <main>. Ahora ese div solo envuelve lo que
              realmente necesita recortarse (fondos 3D/CSS + contenido);
              <Navbar/> queda como hijo directo de este div de afuera, que
              ya NO tiene overflow-hidden. El z-index no cambia (Navbar ya
              usa z-50 en sus propios elementos, por encima de z-10/z-0),
              así que el orden en el DOM no afecta el apilamiento visual. */}
          <div className="relative min-h-screen w-full bg-[#08090D]">

            <div className="relative min-h-screen w-full overflow-hidden">

              {/* Fondo 3D del robot — nunca se monta en mobile/tablet. */}
              {showRobot3D && (
                <div className="fixed inset-0 z-0">
                  <SceneContainer />
                </div>
              )}

              {/* Mobile/tablet: el fondo YA NO es una capa CSS aparte
                  (Starfield.tsx, eliminado) — MobileWordmarkScene.tsx
                  monta su propio DeepSpaceStars (mismos radios que
                  desktop, ver ese archivo), así que este <Canvas> es la
                  única capa de fondo, sin duplicar geometría/gradientes. */}
              {!showRobot3D && (
                <div className="fixed inset-0 z-0">
                  <MobileSceneContainer />
                </div>
              )}

              {/* Intro 2D previa al wordmark 3D — pedido explícito: primero
                  "AVENTHRA" (texto real, heredando la tipografía del logo
                  de desktop, no el modelo 3D) aparece y se desvanece, luego
                  "Tu empleado virtual" aparece y se desvanece, y RECIÉN AHÍ
                  arranca el wordmark 3D (que hasta entonces queda oculto,
                  ver la fase 'pending' en MobileWordmarkScene.tsx). Solo
                  mobile/tablet. */}
              {!showRobot3D && <MobileTextIntro />}

              {/* Contenido — el espacio para el sidebar solo aplica cuando
                  el sidebar existe de verdad (lg), mismo corte que Navbar.
                  RevealedContent lo mantiene montado (nunca se pierde el
                  estado de un form) pero invisible en mobile/tablet hasta
                  que la intro 3D termine (ver el comentario en la
                  definición de RevealedContent, más abajo). */}
              <RevealedContent showRobot3D={showRobot3D}>
                <main className="relative z-10 min-h-screen pl-0 lg:pl-[260px]">
                  {children}
                </main>
              </RevealedContent>

            </div>

            {/* Sidebar / navbar mobile+tablet — fuera del overflow-hidden
                de arriba, ver el comentario del fix de iOS. Mismo gate de
                reveal que el contenido: entra junto, no antes. */}
            <RevealedContent showRobot3D={showRobot3D}>
              <Navbar />
            </RevealedContent>

          </div>
        </ExperienceProvider>
      </MouseProvider>
    </QualityProvider>
  );
};

// Intro 2D previa al wordmark 3D — pedido explícito: "primero el AVENTHRA
// en la mitad de la pantalla, pero no el 3D, hereda esto de la version
// desktop [...] se desvanece, luego aparece tu empleado virtual, y ya
// cuando se desvanezca [...] debe salir el aventhra 3d arriba". Texto real
// en el DOM (no geometría 3D nueva que modelar), heredando LITERAL las
// clases del logo de desktop (Navbar.tsx: aventhra-logo, text-[1.9rem],
// tracking-[0.18em] para "AVENTHRA"; text-[10px] uppercase tracking-
// [0.35em] text-white/35 para el tagline) — mismo look, tamaño de pantalla
// completa en vez de la barra lateral angosta.
//
// Máquina de 2 pasos con temporizadores (no useFrame — esto es puro DOM/
// CSS, no vive dentro del <Canvas>): "aventhra" fade-in→hold→fade-out,
// después "tagline" el mismo ciclo, y al terminar llama a
// setMobileIntroPhase('appear') — recién ahí arranca el wordmark 3D (ver
// la fase 'pending' en MobileWordmarkScene.tsx, que lo mantiene invisible
// hasta ese momento).
const TEXT_INTRO_FADE_MS = 400;
const TEXT_INTRO_HOLD_MS = 1000;
const TEXT_INTRO_STEP_MS = TEXT_INTRO_FADE_MS + TEXT_INTRO_HOLD_MS + TEXT_INTRO_FADE_MS;

function MobileTextIntro() {
  const { actions } = useExperience();
  const [step, setStep] = useState<'aventhra' | 'tagline'>('aventhra');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms));

    // setState diferido en un setTimeout(0), no sincrónico dentro del
    // cuerpo del efecto — mismo patrón que ya usan QualityProvider.tsx y
    // SparkOverlay.tsx en este proyecto para no disparar el lint
    // react-hooks/set-state-in-effect.
    schedule(() => setVisible(true), 0);
    // "AVENTHRA": fade-in inmediato, hold, fade-out.
    schedule(() => setVisible(false), TEXT_INTRO_FADE_MS + TEXT_INTRO_HOLD_MS);

    // "Tu empleado virtual": arranca su fade-in apenas termina el fade-out
    // de arriba, mismo ciclo.
    schedule(() => {
      setStep('tagline');
      setVisible(true);
    }, TEXT_INTRO_STEP_MS);
    schedule(() => setVisible(false), TEXT_INTRO_STEP_MS + TEXT_INTRO_FADE_MS + TEXT_INTRO_HOLD_MS);

    // Recién acá arranca el wordmark 3D.
    schedule(() => actions.setMobileIntroPhase('appear'), TEXT_INTRO_STEP_MS * 2);

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🐛→✅ `transitionDuration` va por `style` inline, NO como clase
  // arbitraria de Tailwind con la variable interpolada (`duration-[${...}
  // ms]`) — mismo problema que el bug real de `top-[calc(...)]` de acá
  // arriba: Tailwind escanea el CÓDIGO FUENTE de forma estática buscando
  // el nombre de clase completo, así que un template literal con una
  // variable adentro nunca genera la regla CSS correspondiente.
  const fadeClass = `transition-opacity motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none" aria-hidden>
      {step === 'aventhra' ? (
        <h1
          style={{ transitionDuration: `${TEXT_INTRO_FADE_MS}ms` }}
          className={`aventhra-logo text-[1.9rem] tracking-[0.18em] text-white ${fadeClass}`}
        >
          AVENTHRA
        </h1>
      ) : (
        <p
          style={{ transitionDuration: `${TEXT_INTRO_FADE_MS}ms` }}
          // Antes text-white/35 (heredado literal del tagline de desktop,
          // pensado para vivir chiquito al lado del logo en la barra
          // lateral) — acá, a pantalla completa, se veía "opaco y poco
          // visible" (feedback real). Mismo tono/grosor que "AVENTHRA":
          // aventhra-logo (misma tipografía/peso 500) + text-white sin
          // opacidad reducida.
          className={`aventhra-logo text-center text-sm uppercase tracking-[0.35em] text-white leading-5 ${fadeClass}`}
        >
          Tu empleado virtual
        </p>
      )}
    </div>
  );
}

// Gate de reveal para mobile/tablet: en desktop (showRobot3D) el contenido
// siempre está visible — ahí el patrón de reveal ya existente (Interface-
// Overlay/RobotController vía ExperienceDirector, con su propio fundido de
// UI) no se toca. En mobile/tablet, <main> Y <Navbar/> quedan invisibles
// (opacity 0 + pointer-events-none, SIN desmontar — no perder el estado de
// ningún formulario ya montado en `children`, ej. el de login) hasta que
// MobileWordmarkScene reporta fase 'settled' (wordmark ya asentado arriba),
// momento en el que ambos entran juntos con un fade
// suave (.nexora-intro-reveal, respeta prefers-reduced-motion — y bajo
// reduced motion la fase ya nace en 'settled', así que esto ni siquiera
// llega a animar: aparece de una, como pide el punto 2 del brief).
function RevealedContent({
  showRobot3D,
  children,
}: {
  showRobot3D: boolean;
  children: React.ReactNode;
}) {
  const { state } = useExperience();
  const introSettled = showRobot3D || state.mobileIntro.phase === 'settled';

  return (
    <div
      className={`nexora-intro-reveal ${introSettled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!introSettled}
    >
      {children}
    </div>
  );
}
