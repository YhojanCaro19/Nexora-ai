'use client';

import React from 'react';
import { ExperienceProvider } from './providers/ExperienceProvider';
import { MouseProvider } from './providers/MouseProvider';
import { QualityProvider } from './providers/QualityProvider';
import { SceneContainer } from '@/components/experience/scene/SceneContainer';
import { Navbar } from '@/components/landing/Navbar';

export const Experience = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <QualityProvider>
      <MouseProvider>
        <ExperienceProvider>
          <div className="relative min-h-screen w-full overflow-hidden bg-[#08090D]">

            {/* Fondo 3D */}
            <div className="fixed inset-0 z-0">
              <SceneContainer />
            </div>

            {/* Sidebar */}
            <Navbar />

            {/* Contenido */}
            <main className="relative z-10 min-h-screen pl-0 md:pl-[260px]">
              {children}
            </main>

          </div>
        </ExperienceProvider>
      </MouseProvider>
    </QualityProvider>
  );
};