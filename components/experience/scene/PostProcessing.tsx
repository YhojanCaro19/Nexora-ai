// components/experience/scene/PostProcessing.tsx
'use client';

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useQuality } from '../providers/QualityProvider';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

export const PostProcessing = () => {
  const { config } = useQuality();

  // Si el nivel de calidad es Low, desactivamos el bloom para ahorrar rendimiento
  if (!config.bloomEnabled) return null;

  return (
    <EffectComposer>
      {/* 
        Bloom extremadamente sutil. 
        intensity: 0.15 da ese brillo mágico sin quemar la pantalla.
      */}
      <Bloom 
        intensity={EXPERIENCE_CONFIG.postprocessing.bloom.intensity}
        threshold={EXPERIENCE_CONFIG.postprocessing.bloom.threshold}
        radius={EXPERIENCE_CONFIG.postprocessing.bloom.radius}
        mipmapBlur
      />
      
      {/* 
        Vignette (oscurecimiento de las esquinas) para dar sensación de profundidad.
      */}
      <Vignette 
        darkness={EXPERIENCE_CONFIG.postprocessing.vignette.darkness}
        offset={EXPERIENCE_CONFIG.postprocessing.vignette.offset}
      />
    </EffectComposer>
  );
};