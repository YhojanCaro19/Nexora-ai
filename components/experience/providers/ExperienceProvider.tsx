// components/experience/providers/ExperienceProvider.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useExperienceDirector } from '@/core/director/ExperienceDirector';
import { ExperienceState } from '@/types/experience.type';

type ExperienceContextValue = {
  state: ExperienceState;
  actions: {
    setPhase: (phase: any) => void;
    setProgress: (progress: number) => void;
    onModelLoaded: () => void;
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

  return (
    <ExperienceContext.Provider value={{ state, actions }}>
      {children}
    </ExperienceContext.Provider>
  );
};