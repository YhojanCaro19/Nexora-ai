// components/experience/providers/ExperienceProvider.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useExperienceDirector } from '@/core/director/ExperienceDirector';
import { ExperiencePhase, ExperienceState, MobileIntroPhase } from '@/types/experience.type';

type ExperienceContextValue = {
  state: ExperienceState & {
    // 🎬 Estado de la escena 3D mobile/tablet (MobileWordmarkScene.tsx),
    // expuesto acá (en vez de quedar como useState local, como estaba
    // antes) para que Experience.tsx pueda leerlo DESDE AFUERA del
    // <Canvas> y decidir cuándo revelar <main>/<Navbar/> — no hace falta
    // un context nuevo: ExperienceProvider ya envuelve exactamente el
    // árbol que lo necesita (MobileSceneContainer + main + Navbar, ver
    // Experience.tsx), y react-three-fiber reenvía el context a través
    // del límite del Canvas (mismo mecanismo que ya usa QualityProvider
    // ahí adentro). Se mantiene como una clave aparte de `phase`/`progress`
    // de arriba a propósito: son dos FSM independientes (esa es la del
    // robot/reveal de desktop, con su propia duración fija de 1.8s vía
    // ExperienceDirector) — mezclarlas en un solo enum hubiera forzado
    // semánticas que no corresponden entre sí.
    mobileIntro: { phase: MobileIntroPhase };
    // 🏠 Home desktop, Momento 2 ("la página real": navbar + pitch de
    // marketing + módulos) a la vista — vive acá por el mismo motivo que
    // mobileIntro de arriba: hay dos consumidores que necesitan enterarse
    // desde AFUERA del árbol donde vive el Home (app/(experience)/
    // (marketing)/page.tsx):
    //   1. Environment.tsx (escena 3D de desktop, DENTRO del <Canvas>
    //      persistente de Experience.tsx) — apaga las estrellas mientras
    //      esto es `true` (react-three-fiber reenvía el context a través
    //      del límite del Canvas, mismo mecanismo que ya usa QualityProvider
    //      ahí adentro).
    //   2. Experience.tsx mismo — el <Navbar/> (barra superior) hoy se
    //      muestra siempre en desktop; con el Home partido en dos momentos,
    //      en ESA ruta puntual debe quedar oculto hasta que esto sea `true`.
    // Default `false`: todas las rutas que nunca lo tocan (login, contacto,
    // sobre-nosotros, y el propio Home antes de llegar a su Momento 2)
    // mantienen el comportamiento de siempre — Navbar visible sin gate
    // extra, estrellas visibles.
    homeMomentTwoVisible: boolean;
    // 🔑 Pedido explícito del usuario: una vez que el scroll "entra" a la
    // Pantalla 2 del Home, scrollear hacia arriba ya NO puede volver a
    // sacar la Pantalla 1 (ver el ref `hasEnteredScreenTwoRef` en
    // HomeExperience.tsx, que hace el bloqueo de verdad) — PERO clickear
    // el logo "AVENTHRA" (ScreenTwoNavbar.tsx) sí debe poder volver a la
    // Pantalla 1 a propósito: es la salida explícita, distinta de un
    // scroll accidental. Un simple contador que se incrementa cada vez que
    // se pide un reset — HomeExperience.tsx lo observa (useEffect con este
    // valor en las deps) y, cuando cambia, desbloquea su ref y hace
    // scroll a 0. Un booleano no alcanzaría: si el usuario pidiera reset
    // dos veces seguidas sin que nada más cambiara entre medio, un
    // booleano que ya estaba en `true` no dispararía el efecto la segunda
    // vez — un contador siempre cambia.
    homeIntroResetToken: number;
  };
  actions: {
    setPhase: (phase: ExperiencePhase) => void;
    setProgress: (progress: number) => void;
    onModelLoaded: () => void;
    setMobileIntroPhase: (phase: MobileIntroPhase) => void;
    setHomeMomentTwoVisible: (visible: boolean) => void;
    resetHomeIntro: () => void;
  };
};

const ExperienceContext = createContext<ExperienceContextValue | undefined>(undefined);

export const useExperience = () => {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error('useExperience must be used within an ExperienceProvider');
  }
  return context;
};

interface ExperienceProviderProps {
  children: ReactNode;
}

export const ExperienceProvider = ({ children }: ExperienceProviderProps) => {
  const { state, actions } = useExperienceDirector();

  // Bajo reduced motion arranca directo en 'settled' — mismo criterio que
  // ya usaba el useState local que reemplaza esto (y que MobileIntro.tsx,
  // ya descartado, hacía del lado CSS): nunca se monta el pop de aparición
  // ni la subida del wordmark, ni tampoco la intro 2D previa (MobileText-
  // Intro en Experience.tsx) — bajo reduced motion no hay intro de ningún
  // tipo, aparece asentado de una. Sin reduced motion arranca en 'pending'
  // (no 'appear' directo): MobileTextIntro corre su propia secuencia 2D
  // primero y recién al terminar llama a setMobileIntroPhase('appear') —
  // ver el comentario en MobileIntroPhase (types/experience.type.ts).
  const prefersReducedMotion = useReducedMotion();
  const [mobileIntroPhase, setMobileIntroPhase] = useState<MobileIntroPhase>(() =>
    prefersReducedMotion ? 'settled' : 'pending'
  );

  // Default `false` — ver el comentario de `homeMomentTwoVisible` en el
  // tipo de arriba. Solo el Home (desktop) lo prende al hacer scroll hasta
  // su Momento 2.
  const [homeMomentTwoVisible, setHomeMomentTwoVisible] = useState(false);

  // Ver el comentario de `homeIntroResetToken` en el tipo de arriba —
  // arranca en 0, cualquier incremento es "se pidió volver a la Pantalla
  // 1", observado por HomeExperience.tsx.
  const [homeIntroResetToken, setHomeIntroResetToken] = useState(0);
  const resetHomeIntro = () => setHomeIntroResetToken((token) => token + 1);

  return (
    <ExperienceContext.Provider
      value={{
        state: { ...state, mobileIntro: { phase: mobileIntroPhase }, homeMomentTwoVisible, homeIntroResetToken },
        actions: { ...actions, setMobileIntroPhase, setHomeMomentTwoVisible, resetHomeIntro },
      }}
    >
      {children}
    </ExperienceContext.Provider>
  );
};