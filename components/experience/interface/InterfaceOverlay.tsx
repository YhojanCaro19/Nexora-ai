// components/experience/interface/InterfaceOverlay.tsx
'use client';

import React from 'react';
import { useExperience } from '../providers/ExperienceProvider';
import { ExperiencePhase } from '@/types/experience.type';
import { Navbar } from '@/components/landing/Navbar';
import { HeroContent } from '@/components/landing/HeroContent';

export const InterfaceOverlay = () => {
  const { state } = useExperience();
  const { phase } = state;

  const isUIVisible = phase === ExperiencePhase.REVEAL_UI || phase === ExperiencePhase.INTERACTIVE;

  return (
    <div className="flex flex-col h-full w-full relative">
      
      {/* NAVBAR CENTRADO - Estilo Apple */}
      <div className={`absolute top-0 left-0 right-0 z-20 flex justify-center transition-all duration-1000 ease-out ${
        isUIVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        {/* Contenedor interno con ancho máximo para que no se estire a los bordes */}
        <div className="w-full max-w-6xl px-6">
          <Navbar />
        </div>
      </div>

      {/* HERO CONTENT - Anclado a la izquierda */}
      <div className={`absolute top-[35%] left-12 md:left-20 -translate-y-1/2 z-10 max-w-xl transition-all duration-1200 delay-300 ease-out ${
        isUIVisible 
          ? 'opacity-100 translate-y-0 blur-0' 
          : 'opacity-0 translate-y-8 blur-md pointer-events-none'
      }`}>
        <HeroContent />
      </div>

    </div>
  );
};