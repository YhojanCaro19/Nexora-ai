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
        // instante.
        float cellPhase = hash(cellId) * 500.0;
        float cycle = (uTime + cellPhase) * uPulseSpeed * 2.2;
        float localStep = floor(cycle);
        float seed = cellId + localStep * 131.0;

        float chance = hash(seed);
        // Umbral alto: pocas celdas encendidas a la vez. Con la densidad
        // anterior (12% de 160 celdas) casi siempre había alguna chispa en
        // cada franja del cable, así que se veía como si TODO el cable
        // cambiara de color a la vez en vez de chispazos sueltos.
        float ignites = step(0.975, chance);

        // Dentro del ciclo que le tocó a esta celda, el destello es un pulso
        // CORTO (sube y baja rápido) en vez de quedar prendido el ciclo
        // entero — así se ve como una chispa puntual, no como un bloque de
        // color fijo.
        float t = fract(cycle);
        float flash = smoothstep(0.0, 0.08, t) - smoothstep(0.08, 0.3, t);

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
