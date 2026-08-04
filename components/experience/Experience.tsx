// components/experience/Experience.tsx
'use client';

import React from 'react';
import { ExperienceProvider } from './providers/ExperienceProvider';
import { MouseProvider } from './providers/MouseProvider';
import { QualityProvider } from './providers/QualityProvider';
import { SceneContainer } from '@/components/experience/scene/SceneContainer';
import { Navbar } from '@/components/landing/Navbar';

export const Experience = ({ children }: { children: React.ReactNode }) => {
  return (
    <QualityProvider>
      <MouseProvider>
        <ExperienceProvider>
          <div className="relative min-h-screen w-full overflow-hidden bg-[#08090D]">

            {/* CAPA 1: El mundo 3D — persiste entre rutas, nunca se desmonta */}
            <div className="fixed inset-0 z-0">
              <SceneContainer />
            </div>

            {/* CAPA 2: Navbar — siempre visible arriba */}
            <div className="fixed top-0 left-0 w-full z-20">
              <Navbar />
            </div>

            {/* CAPA 3: Contenido de cada página — panel izquierdo.
                pt-20 deja espacio para que el navbar fijo no se monte
                encima del contenido (antes causaba el overlap). */}
            <div className="relative z-10 min-h-screen flex items-center pt-20 pointer-events-none">
              <div className="pointer-events-auto w-full">
                {children}
              </div>
            </div>

          </div>
        </ExperienceProvider>
      </MouseProvider>
    </QualityProvider>
  );
};