// core/config/experience.config.ts
export const EXPERIENCE_CONFIG = {
  camera: {
    fov: 45,
    position: [0, 0, 4.5] as [number, number, number],
    damping: 0.045,
    maxYaw: 0.35,
    maxPitch: 0.2,
  },

  lighting: {
    revealDuration: 0.8,
    intensity: {
      ambient: 0.2,
      key: 2.5,
      fill: 0.9,
      rim: 2.6,
    }
  },

  robot: {
    // 🔥 Estas dos líneas son las que faltaban — única fuente de verdad
    // de posición, usada por RobotScene, CameraRig y Lighting.
    baseX: 2.5,
    baseY: -0.46,
    inertia: 0.025,
    floatAmplitude: 0.03,
    floatSpeed: 0.8,
    breathScale: 1.001,
    emissivePulseSpeed: 0.6,
    // 🎨 Material del cuerpo — única fuente de verdad, la usan tanto
    // Robot.tsx (el mesh) como DescentCables.tsx (para que los cables sean
    // del mismo material, no un shader aparte).
    bodyColor: '#f0f3f8',
    bodyMetalness: 0.55,
    bodyRoughness: 0.28,
    // Cables: mismo material/brillo que el cuerpo (para que se note que
    // "vienen del mismo robot"), solo que en un tono más oscuro — el tubo
    // en sí NO cambia de color ni brilla solo; el efecto de energía va
    // aparte, en destellos puntuales (ver CablePulseShader.tsx).
    cableColor: '#7d818a',
  },

  postprocessing: {
    bloom: {
      intensity: 0.15,
      threshold: 1.0,
      radius: 0.5,
    },
    vignette: {
      darkness: 0.4,
      offset: 0.1,
    }
  },

  performance: {
    fpsThreshold: 45,
    qualityLevels: {
      Ultra: { dpr: 2, bloomEnabled: true, cableShaders: true, shadows: true },
      High:  { dpr: 1.5, bloomEnabled: true, cableShaders: true, shadows: false },
      Medium: { dpr: 1, bloomEnabled: true, cableShaders: false, shadows: false },
      Low:   { dpr: 1, bloomEnabled: false, cableShaders: false, shadows: false },
    }
  },

  ui: {
    staggerDelay: 0.1,
    fadeDuration: 0.9,
  },

  entryAnimation: {
    // 🪝 Descenso por cables: el robot arranca "dropHeight" unidades por
    // encima de su Y final (baseY) y baja en línea recta en "descentDuration"
    // segundos. X/Z quedan fijos en su destino desde el primer frame.
    endZ: 1.9,
    dropHeight: 9,
    descentDuration: 3.4,
    // Al llegar: los cables se retraen hacia arriba y se desvanecen, y la
    // cabeza/cuello (que bajó inclinada) se endereza — los tres sincronizados
    // sobre esta misma duración.
    releaseDuration: 1.6,
    // Inclinación de cabeza/cuello mientras cuelga de los cables (radianes),
    // se endereza en sincronía con la soltada. Confirmada en pantalla — este
    // signo sí quedó bien.
    headTiltAngle: 0.55,
    // Leve balanceo tipo péndulo mientras baja, para que no se sienta
    // rígido — se apaga solo al llegar.
    swayAmplitude: 0.06,
    swaySpeed: 1.6,
  },
} as const;

export type ExperienceConfig = typeof EXPERIENCE_CONFIG;