// components/experience/providers/QualityProvider.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

type QualityLevel = 'Ultra' | 'High' | 'Medium' | 'Low';

// Fijo en 'Ultra' siempre, sin auto-ajuste por FPS ni por tier de
// viewport — pedido explícito del usuario ("no bajes la calidad, dejalo
// siempre en ultra") tras varias rondas persiguiendo un bug de color/
// brillo en el wordmark mobile que resultó venir de acá, no de sus luces:
// el nivel arrancaba distinto según el tier (mobile→'Low', con
// bloomEnabled=false) y encima el auto-ajuste de FPS lo cambiaba en vivo
// (pensado para el robot de desktop, pero cualquier cambio a mitad de la
// intro del wordmark se leía como un salto real de brillo/color — el
// mismo look "Ultra" que al usuario le gustó del primer frame).
//
// Se quita el sistema de niveles dinámico por completo: mismo `config`
// (bloom, dpr, cableShaders, shadows) para TODA la app, TODO el tiempo,
// sin excepción — decisión consciente del usuario, no un descuido. Si
// algún dispositivo real de gama baja sufre de rendimiento por esto, es
// el trade-off que pidió explícitamente; ya no hay ningún mecanismo que
// lo compense solo.
const level: QualityLevel = 'Ultra';
const config = EXPERIENCE_CONFIG.performance.qualityLevels[level];

type QualityContextValue = {
  level: QualityLevel;
  config: typeof EXPERIENCE_CONFIG.performance.qualityLevels[QualityLevel];
};

const QUALITY_CONTEXT_VALUE: QualityContextValue = { level, config };

const QualityContext = createContext<QualityContextValue | undefined>(undefined);

export const useQuality = () => {
  const context = useContext(QualityContext);
  if (!context) {
    throw new Error('useQuality must be used within a QualityProvider');
  }
  return context;
};

interface QualityProviderProps {
  children: ReactNode;
}

export const QualityProvider = ({ children }: QualityProviderProps) => {
  return (
    <QualityContext.Provider value={QUALITY_CONTEXT_VALUE}>
      {children}
    </QualityContext.Provider>
  );
};
