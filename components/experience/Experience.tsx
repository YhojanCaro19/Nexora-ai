'use client';

import React from 'react';
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
