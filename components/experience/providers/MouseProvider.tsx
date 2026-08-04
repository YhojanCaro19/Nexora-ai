// components/experience/providers/MouseProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { lerp } from '@/lib/math';

type MouseData = {
  x: number;
  y: number;
  normalizedX: number; // -1 a 1
  normalizedY: number; // -1 a 1
  smoothX: number;
  smoothY: number;
  velocity: number;
};

const MouseContext = createContext<MouseData | undefined>(undefined);

export const useMouse = () => {
  const context = useContext(MouseContext);
  if (!context) {
    throw new Error('useMouse must be used within a MouseProvider');
  }
  return context;
};

interface MouseProviderProps {
  children: ReactNode;
}

export const MouseProvider = ({ children }: MouseProviderProps) => {
  // CORRECCIÓN AQUÍ: Inicializamos con null para evitar el error de TypeScript
  const mouseRef = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -((e.clientY / window.innerHeight) * 2 - 1);
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Loop de suavizado (interpolación)
    const updateSmooth = () => {
      const { x, y, smoothX, smoothY } = mouseRef.current;
      // Usamos el damping configurado en el archivo de configuración
      const damping = EXPERIENCE_CONFIG.camera.damping;
      
      mouseRef.current.smoothX = lerp(smoothX, x, damping);
      mouseRef.current.smoothY = lerp(smoothY, y, damping);
      frameRef.current = requestAnimationFrame(updateSmooth);
    };
    updateSmooth();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const value: MouseData = {
    x: mouseRef.current.x,
    y: mouseRef.current.y,
    normalizedX: mouseRef.current.x,
    normalizedY: mouseRef.current.y,
    smoothX: mouseRef.current.smoothX,
    smoothY: mouseRef.current.smoothY,
    velocity: 0,
  };

  return (
    <MouseContext.Provider value={value}>
      {children}
    </MouseContext.Provider>
  );
};