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
  };
  actions: {
    setPhase: (phase: ExperiencePhase) => void;
    setProgress: (progress: number) => void;
    onModelLoaded: () => void;
    setMobileIntroPhase: (phase: MobileIntroPhase) => void;
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

  return (
    <ExperienceContext.Provider
      value={{
        state: { ...state, mobileIntro: { phase: mobileIntroPhase } },
        actions: { ...actions, setMobileIntroPhase },
      }}
    >
      {children}
    </ExperienceContext.Provider>
  );
};