// components/experience/scene/entities/cables/CablePulseShader.tsx
//
// Esto NO pinta el cable — es una capa aparte, transparente salvo en los
// destellos, que se monta ENCIMA de un cable sólido (ver DescentCables.tsx).
// El tubo mantiene su color normal siempre; esto solo agrega chispazos
// puntuales que aparecen y desaparecen, como energía saltando por fuera.
import { ShaderMaterial, Color, AdditiveBlending } from 'three';

export const createSparkOverlayMaterial = (hotColor: string = '#eaffff') => {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHotColor: { value: new Color(hotColor) },
      uPulseSpeed: { value: 1.0 },
      // Multiplicador de opacidad global (1 = normal, 0 = invisible).
      // Lo usan los cables de descenso para desvanecerse al soltarse.
      uFade: { value: 1.0 },
      // Umbral de "qué tan seguido enciende" una celda (0.975 = solo ~2.5%
      // de las veces, el valor que ya usaba el robot) — configurable para
      // que attachSparkOverlays.ts pueda subirle la frecuencia SOLO al
      // wordmark sin tocar este default ni el robot (DescentCables.tsx no
      // lo toca, se queda en 0.975 de siempre).
      uIgniteThreshold: { value: 0.975 },
      // Desfase de tiempo POR MALLA (no por celda). cellId sale solo de la
      // UV local (0-4 en X, 0-10 en Y), así que dos overlays clonados
      // DISTINTOS —p.ej. un chip de la "A" y uno de la "V" del wordmark—
      // comparten el mismo rango de UV y, con uInstanceSeed en 0, el mismo
      // cellId cae en el MISMO instante real en las dos letras: se
      // encienden juntas sin querer ("ráfaga sincronizada" reportada por
      // el usuario). Sumar un valor único por malla acá desfasa cada clon
      // de los demás. Default 0.0 = comportamiento IDÉNTICO a antes — el
      // robot (DescentCables.tsx) nunca setea este uniform.
      uInstanceSeed: { value: 0.0 },
      // Multiplicador de "qué tan gradual" es la curva de encendido/
      // apagado de la chispa (ver `flash` abajo). 1.0 = comportamiento
      // IDÉNTICO a antes (curva original, la que ya usa el robot). El
      // wordmark lo sube un poco para que el flash suba más despacio y no
      // se sienta como un golpe brusco.
      uFlashSoftness: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uHotColor;
      uniform float uTime;
      uniform float uPulseSpeed;
      uniform float uFade;
      uniform float uIgniteThreshold;
      uniform float uInstanceSeed;
      uniform float uFlashSoftness;

      varying vec2 vUv;

      float hash(float n) {
        return fract(sin(n) * 43758.5453123);
      }

      void main() {
        // Cuadrícula en las DOS direcciones (largo y alrededor del tubo),
        // para que cada destello sea un punto suelto, no un anillo.
        // Celdas más grandes (menos divisiones) para que cada chispa se lea
        // como un punto reconocible y no como ruido fino imperceptible.
        float cellX = floor(vUv.x * 4.0);
        float cellY = floor(vUv.y * 10.0);
        float cellId = cellX + cellY * 37.0;

        // Cada celda tiene su PROPIA línea de tiempo, desfasada al azar
        // (cellPhase), para que no "tiren los dados" todas en el mismo
        // instante. uInstanceSeed (default 0.0) suma un desfase extra POR
        // MALLA encima de eso — sin él, la MISMA celda [cellX, cellY] en
        // dos mallas clonadas distintas (dos letras distintas del
        // wordmark) cae exactamente en el mismo cellPhase y enciende en el
        // mismo instante real, aunque estén en letras separadas.
        float cellPhase = hash(cellId) * 500.0 + uInstanceSeed;
        float cycle = (uTime + cellPhase) * uPulseSpeed * 2.2;
        float localStep = floor(cycle);
        float seed = cellId + localStep * 131.0;

        float chance = hash(seed);
        // Umbral configurable (uIgniteThreshold, default 0.975 = pocas
        // celdas encendidas a la vez — con la densidad anterior, 12% de
        // 160 celdas, casi siempre había alguna chispa en cada franja del
        // cable, así que se veía como si TODO el cable cambiara de color a
        // la vez en vez de chispazos sueltos). El wordmark lo baja para
        // que se sientan mucho más seguidas (ver attachSparkOverlays.ts).
        float ignites = step(uIgniteThreshold, chance);

        // Dentro del ciclo que le tocó a esta celda, el destello es un pulso
        // CORTO (sube y baja rápido) en vez de quedar prendido el ciclo
        // entero — así se ve como una chispa puntual, no como un bloque de
        // color fijo.
        // uFlashSoftness (default 1.0, sin cambios) estira las dos paradas
        // de la curva por igual: sube más gradual y se apaga más gradual,
        // en vez del golpe corto/brusco original. Con 1.0 da exactamente
        // 0.08/0.3 de siempre (el robot).
        float t = fract(cycle);
        float flashRise = 0.08 * uFlashSoftness;
        float flashFall = 0.3 * uFlashSoftness;
        float flash = smoothstep(0.0, flashRise, t) - smoothstep(flashRise, flashFall, t);

        float spark = ignites * flash * hash(seed * 1.37);

        gl_FragColor = vec4(uHotColor, spark * uFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: 2, // DoubleSide
  });
};
