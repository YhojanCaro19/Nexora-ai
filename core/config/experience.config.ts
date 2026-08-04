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
      rim: 1.8,
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
    startZ: -45,
    endZ: 1.9,
    duration: 2.5,
    easingFactor: 0.04,
  },
} as const;

export type ExperienceConfig = typeof EXPERIENCE_CONFIG;