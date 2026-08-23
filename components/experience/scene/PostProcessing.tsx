// components/experience/scene/PostProcessing.tsx
'use client';

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useQuality } from '../providers/QualityProvider';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

type QualityConfig = typeof EXPERIENCE_CONFIG.performance.qualityLevels[
  keyof typeof EXPERIENCE_CONFIG.performance.qualityLevels
];

interface PostProcessingProps {
  /** Config a usar EN VEZ de la del contexto QualityProvider en vivo.
   * Sin esta prop (uso normal, ej. SceneContainer.tsx del robot desktop)
   * el comportamiento es idéntico a antes: reacciona en vivo al
   * auto-ajuste de FPS. Con esta prop (MobileSceneContainer.tsx) la
   * escena que la pasa decide congelar el nivel de calidad — ver el
   * comentario en ese archivo para el porqué. */
  configOverride?: QualityConfig;
}

export const PostProcessing = ({ configOverride }: PostProcessingProps = {}) => {
  const { config: liveConfig } = useQuality();
  const config = configOverride ?? liveConfig;

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