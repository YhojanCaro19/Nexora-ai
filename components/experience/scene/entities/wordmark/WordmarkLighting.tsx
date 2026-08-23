// components/experience/scene/entities/wordmark/WordmarkLighting.tsx
//
// Mismo rig de luces que components/experience/scene/Lighting.tsx (el que
// usa el robot en desktop) — pedido explícito del usuario tras ver una
// captura real de cómo se ve el robot: "quiero que el AVENTHRA se vea así
// literal, igual". El wordmark mobile nunca tuvo este rig montado (solo 2
// directional lights ad-hoc + ambient) — eso explicaba el look "opaco/
// plano" pese a compartir el mismo material metálico (bodyMetalness/
// bodyRoughness, aplicado en WordmarkModel.tsx vía applyBodyMaterial).
//
// Este archivo SOLO exporta la parte fija en world space: ambient + 3
// directional light. Una directional light no tiene falloff por
// distancia — su `position` solo define un ÁNGULO ("de dónde viene el
// sol"), no un punto en el espacio — así que da igual dónde esté el
// wordmark en cada fase, es correcto que quede fija y copiada literal.
//
// Los 2 pointLight de halo (cian/violeta) YA NO viven acá — pasaron por
// dos intentos fallidos que vale la pena dejar registrados para no
// repetirlos:
//  1º intento: pointLight fijas en world space sobre CFG.restPosition.
//     Bug: el wordmark arranca 'appear' lejos de ahí (en appearPositionY),
//     así que quedaban fuera de su `distance` de corte al inicio y solo
//     "se prendían" a mitad de 'rise' — el brillo se sentía "subir" junto
//     con la animación.
//  2º intento: pointLight DENTRO del <group> animado (coordenadas
//     locales), asumiendo que bastaba con heredar el transform del padre.
//     Bug distinto: ese mismo <group> anima su `scale` de 0 → restScale
//     durante 'appear' (el pop), y three.js multiplica la `position`
//     LOCAL de sus hijos por ese scale — con scale≈0 al arrancar, la luz
//     quedaba casi pegada a la superficie (pico de brillo por la caída
//     inversa al cuadrado), y bajaba a su nivel normal recién cuando el
//     wordmark llegaba a su tamaño final. Mismo síntoma percibido ("sube,
//     se nota un salto, después baja"), causa distinta.
//
// Fix real: la distancia REAL entre estas luces y la malla tiene que ser
// constante en unidades de mundo en TODA la animación, sin importar fase/
// scale/posición — eso no se puede lograr siendo hijas de un transform que
// escala (ni en world space fijo, ni en local space del group). Por eso
// ahora viven en MobileWordmarkScene.tsx, como hermanas sueltas del
// <group> con su propia ref, actualizadas cuadro a cuadro en el MISMO
// useFrame que ya mueve wordmarkGroupRef: position = group.position +
// offset FIJO (sin multiplicar por scale). Ver ese archivo para el detalle.
'use client';

import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

// Solo para key/rim — fill y ambient del robot se dejan intactos. Ajuste
// sobre feedback real ("ya se ve demasiado brillante"): el wordmark es
// geometría más PLANA (letras extruidas, bisel simple) que el robot
// (mucha más variación de superficie, cóncava/convexa), así que la misma
// intensidad key/rim absoluta (2.5/2.6, tuneada para el robot) se lee más
// "quemada/plana" acá en vez de modulada. Constante LOCAL a este archivo
// — no se toca EXPERIENCE_CONFIG.lighting ni Lighting.tsx, que siguen
// sirviendo al robot tal cual.
// Bajado de 0.7 a 0.45 junto con el ajuste de metalness/roughness en
// WordmarkModel.tsx: la causa real del "se ilumina más al subir" es que
// estas 2 luces (key/rim, direccionales) generan un reflejo especular que
// depende del ángulo cámara↔superficie — ángulo que sí cambia un poco
// entre 'appear' (centro) y 'settled' (arriba), cámara fija. No se puede
// eliminar del todo sin aplanar el material más de lo que al usuario le
// gustó, así que se ataca por los dos lados: material menos sensible +
// menos intensidad en las luces que más generan ese pico puntual.
const WORDMARK_KEY_RIM_INTENSITY_SCALE = 0.45;

/** Ambient + 3 directional lights — world space, fijas, no dependen de
 * la fase/posición/escala del wordmark. Se monta como hermana del
 * <group> animado en MobileWordmarkScene.tsx. */
export function WordmarkAmbientLighting() {
  return (
    <group>
      <ambientLight
        intensity={EXPERIENCE_CONFIG.lighting.intensity.ambient}
        color="#404060"
      />

      <directionalLight
        position={[0, 3, 6]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.key * WORDMARK_KEY_RIM_INTENSITY_SCALE}
        color="#ffffff"
      />

      <directionalLight
        position={[-4, -2, 3]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.fill}
        color="#818CF8"
      />

      <directionalLight
        position={[0, 4, -5]}
        intensity={EXPERIENCE_CONFIG.lighting.intensity.rim * WORDMARK_KEY_RIM_INTENSITY_SCALE}
        color="#4CC2E8"
      />
    </group>
  );
}

// Color + intensity de los 2 pointLight de halo — únicas fuentes de
// verdad para MobileWordmarkScene.tsx (que es quien las posiciona cuadro
// a cuadro, ver el comentario de arriba). Mismo color que Lighting.tsx
// (#4CC2E8/#A78BFA); intensity ya bajada dos veces sobre feedback real
// ("todo teñido" → ~40-45% del original; "demasiado brillante" → otro
// ~25% sobre eso) — si after el fix de posición de este archivo el
// usuario TODAVÍA ve variación o exceso de brillo, el problema ya no es
// un número de intensity, hay que revisar de nuevo el mecanismo.
export const WORDMARK_HALO_LIGHTS = {
  cyan: { color: '#4CC2E8', intensity: 1.5, distance: 1.4, offset: [0, 0.15, -0.5] as const },
  violet: { color: '#A78BFA', intensity: 0.6, distance: 1, offset: [-0.35, 0, -0.4] as const },
};
