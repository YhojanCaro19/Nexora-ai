// components/experience/scene/Lighting.tsx
'use client';

import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

// Luces fijas, sin rampa de fase: siempre en el mismo color/intensidad que
// antes se veía solo una vez "asentado" el robot. Antes había un fade-in
// (0 → intensidad final) atado a ExperiencePhase, pero el robot tardaba más
// en llegar a su posición que en terminar ese fade, así que la luz ya estaba
// al máximo antes de que "se posicionara" — leyéndose como un cambio de
// brillo. Quitarlo del todo es lo que se pidió: nunca varía.
export const Lighting = () => {
  return (
    <group>
      <ambientLight
        intensity={EXPERIENCE_CONFIG.lighting.intensity.ambient}
        color="#404060"
      />

      <directionalLight
        position={[0, 3, 6]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.key}
        color="#ffffff"
      />

      <directionalLight
        position={[-4, -2, 3]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.fill}
        color="#818CF8"
      />

      <directionalLight
        position={[0, 4, -5]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.rim}
        color="#4CC2E8"
      />

      {/* 🔥 LUZ ASTRAL: halo puntual detrás del robot, como si emanara luz propia */}
      <pointLight
        position={[EXPERIENCE_CONFIG.robot.baseX, EXPERIENCE_CONFIG.robot.baseY + 0.3, -1.4]}
        intensity={3.5}
        distance={4}
        color="#4CC2E8"
      />
      <pointLight
        position={[EXPERIENCE_CONFIG.robot.baseX - 0.6, EXPERIENCE_CONFIG.robot.baseY, -1.1]}
        intensity={1.8}
        distance={3}
        color="#A78BFA"
      />
    </group>
  );
};
