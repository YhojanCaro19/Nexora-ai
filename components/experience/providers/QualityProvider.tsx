// components/experience/providers/QualityProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

type QualityLevel = 'Ultra' | 'High' | 'Medium' | 'Low';

type QualityContextValue = {
  level: QualityLevel;
  config: typeof EXPERIENCE_CONFIG.performance.qualityLevels[QualityLevel];
};

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
  const [level, setLevel] = useState<QualityLevel>('Ultra');
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  
  // CORRECCIÓN AQUÍ: Agregamos null como valor inicial.
  // Esto arregla el error "Expected 1 arguments, but got 0."
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkFPS = () => {
      const now = performance.now();
      frameCountRef.current += 1;

      // Revisamos cada 1 segundo (1000ms)
      if (now - lastTimeRef.current >= 1000) {
        const fps = frameCountRef.current;
        
        // Reiniciamos los contadores para el siguiente segundo
        frameCountRef.current = 0;
        lastTimeRef.current = now;

        const threshold = EXPERIENCE_CONFIG.performance.fpsThreshold;
        const levels: QualityLevel[] = ['Ultra', 'High', 'Medium', 'Low'];
        const currentIndex = levels.indexOf(level);

        // Si los FPS caen por debajo del umbral, bajamos la calidad
        if (fps < threshold && currentIndex < levels.length - 1) {
          setLevel(levels[currentIndex + 1]);
        } 
        // Si los FPS suben con creces, subimos la calidad (para ser amables con el hardware bueno)
        else if (fps > threshold * 1.5 && currentIndex > 0) {
          setLevel(levels[currentIndex - 1]);
        }
      }
      
      // Programamos la siguiente comprobación en 200ms
      timeoutRef.current = setTimeout(checkFPS, 200);
    };

    // Iniciamos el ciclo de chequeo
    timeoutRef.current = setTimeout(checkFPS, 200);

    return () => {
      // Limpiamos el timeout al desmontar el componente
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [level]);

  const config = EXPERIENCE_CONFIG.performance.qualityLevels[level];

  return (
    <QualityContext.Provider value={{ level, config }}>
      {children}
    </QualityContext.Provider>
  );
};