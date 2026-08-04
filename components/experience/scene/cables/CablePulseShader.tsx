// components/experience/scene/entities/cables/CablePulseShader.tsx
import { ShaderMaterial, Color } from 'three';

export const createCablePulseMaterial = (color: string = '#4CC2E8') => {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uPulseSpeed: { value: 0.4 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uPulseSpeed;

      varying vec2 vUv;

      void main() {
        // La coordenada Y del UV recorre el cable de arriba a abajo (o viceversa)
        // Calculamos el pulso: una onda que viaja a lo largo de la Y
        float pulse = sin((vUv.y - uTime * uPulseSpeed) * 20.0) * 0.5 + 0.5;
        
        // Hacemos que el pulso sea más brillante en el centro y se desvanezca en los bordes
        float intensity = pow(pulse, 4.0) * 0.8; 
        
        // El borde del cable siempre tiene un brillo tenue
        float baseGlow = 0.15;

        gl_FragColor = vec4(uColor, baseGlow + intensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: 2, // DoubleSide para que se vea desde cualquier ángulo
  });
};