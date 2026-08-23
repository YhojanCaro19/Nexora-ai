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

  // Escena 3D real de mobile/tablet (< 1024px) — reemplaza tanto al robot
  // (que ahí no se monta) como a la intro CSS 2D que hubo antes de esto.
  // Única fuente de verdad de posición/tiempos, usada por
  // MobileWordmarkScene.tsx y MobileSceneContainer.tsx.
  //
  // Secuencia (2 fases animadas, ver MobileWordmarkScene.tsx):
  //   1. "appear": el wordmark completo aparece de golpe (pop de escala,
  //      no un fundido lento) centrado verticalmente en pantalla, ya con
  //      chispas — reemplaza a la vieja fase "emblem" (la "A" sola
  //      lanzándose desde el fondo), que se eliminó por pedido explícito.
  //   2. "rise": sube desde ese centro hasta restPosition (arriba, cerca
  //      del navbar), donde queda en reposo.
  //   "settled" no es una fase animada en sí — es el estado persistente:
  //   MobileWordmarkScene.tsx lo hace flotar con la misma onda senoidal
  //   que EXPERIENCE_CONFIG.robot (floatSpeed/floatAmplitude) en vez de
  //   los cables cayendo que tenía antes (eliminados, ver WordmarkModel.tsx).
  mobileWordmark: {
    camera: {
      fov: 42,
      position: [0, 0, 6] as [number, number, number],
    },
    // Reposo final: el wordmark queda cerca de ARRIBA de la pantalla (no
    // centrado) — es lo que reemplaza al texto "AVENTHRA" que antes vivía
    // en la barra superior del Navbar mobile/tablet.
    //
    // Y/Z pasaron por varias rondas de feedback real (2.1→1.5→1.65→1.34→
    // 1.273 de Y; 0→1→2.2 de Z) que terminaron en un punto demasiado
    // cerca ("ya se ve demasiado cerca"). Reset con criterio claro:
    // Z=1.55 es un punto medio entre "muy lejos" (Z=1) y "demasiado cerca"
    // (Z=2.2) — distancia real cámara-objeto = 6-1.55 = 4.45 (cámara en
    // z=6). Y=1.5 recalculado para ESE Z, no heredado de la ronda
    // anterior: semi-altura visible en Z=1.55 = tan(21°)×4.45 ≈1.71
    // unidades de mundo; Y=1.5 deja ~0.21 de margen bajo el borde visible
    // (suficiente para la altura del propio wordmark + no pisar el status
    // bar/hamburguesa del Navbar) sin quedar pegado al centro tampoco.
    // Si hace falta otro ajuste de Y, el criterio para no repetir el bug
    // de "se sale de pantalla" es siempre el mismo: semi-altura visible en
    // esta profundidad = tan(fov/2) × (camera.position.z - restPosition.z).
    restPosition: [0, 1.5, 1.55] as [number, number, number],
    // Y donde aparece el wordmark en la fase "appear" — mitad de la
    // pantalla, no arriba del todo (pedido explícito). y=0 ya cae
    // exactamente en el centro vertical visible: la cámara está en
    // position=[0,0,6] sin rotación, mirando hacia el origen.
    appearPositionY: 0,
    // La escala en reposo YA NO es un número fijo acá — un restScale
    // estático no tenía en cuenta el aspect ratio real del viewport (mismo
    // tamaño absoluto en unidades de mundo, pero el ancho visible cambia
    // muchísimo entre un iPhone angosto y una tablet), lo que hacía que el
    // wordmark se viera gigante/recortado en teléfonos angostos. Ahora se
    // calcula en tiempo real como fracción del ancho visible del viewport
    // — ver WORDMARK_TARGET_WIDTH_FRACTION en MobileWordmarkScene.tsx.
    appear: {
      // Cuánto tarda el "pop" de aparición (scale 0 → 1) — rápido y seco
      // ("de la nada aparece"), no un fundido lento.
      popDuration: 0.28,
      // Tiempo extra quieto en el centro, después del pop, antes de
      // arrancar a subir — para que el usuario alcance a registrar que
      // apareció ahí, no que "nace ya subiendo".
      holdDuration: 0.45,
    },
    // Cuánto tarda el wordmark en subir desde el centro hasta restPosition.
    riseDuration: 0.9,
    // El fondo de estrellas de esta escena YA NO tiene su propio
    // count/radio acá — hereda tal cual los radios de DeepSpaceStars que
    // usa desktop (30–70, ver Environment.tsx) con +15% de densidad; ver
    // MOBILE_STAR_COUNT en MobileWordmarkScene.tsx.
  },
} as const;

export type ExperienceConfig = typeof EXPERIENCE_CONFIG;