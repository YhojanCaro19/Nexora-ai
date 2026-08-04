// components/experience/scene/Environment.tsx
'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const STAR_COUNT = 3000;

// ============================================
// 1. FONDO DE ESTRELLAS (Sutiles, con deriva lenta)
// ============================================
function DeepSpaceStars() {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 30 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      positions[i * 3 + 2] = Math.cos(phi) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#a0b4ff',
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0001;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// ============================================
// 2. LUZ AMBIENTAL CINEMATOGRÁFICA (Mi toque personal)
// ============================================
function CinematicOrbitalLight() {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 40.00;

    if (lightRef.current) {
      const x = Math.sin(t) * 16;
      const z = Math.cos(t * 0.8) * 12 - 4;
      const y = Math.sin(t * 0.4) * 3 + 1;

      lightRef.current.position.set(x, y, z);

      const intensityBase = 4.0;
      const intensityBreath = Math.sin(t * 0.5) * 1.5;
      lightRef.current.intensity = intensityBase + intensityBreath;

      const hue = 0.68 + Math.sin(t * 0.08) * 0.07;
      lightRef.current.color.setHSL(hue, 0.9, 0.55);
    }
  });

  return <pointLight ref={lightRef} distance={35} decay={1.5} />;
}

// ============================================
// 3. BRILLO SIEMPRE VISIBLE (nuevo)
// ============================================
// Un pointLight solo ilumina lo que tiene cerca — por eso no basta para un
// "siempre presente en pantalla". Este es un plano con shader que actúa
// como el brillo en sí mismo, anclado a la cámara (billboard): recalculamos
// su posición mundial cada frame vía camera.matrixWorld, así viaja de
// izquierda a derecha de LO QUE VES, sin importar hacia dónde mire lookAt().
function AmbientSweep() {
  const meshRef = useRef<THREE.Mesh>(null);
  const localOffset = useMemo(() => new THREE.Vector3(), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color('#7c9cff') },
          uOpacity: { value: 0.22 },
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
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - vec2(0.5));
            // Caída muy suave — sin borde duro, se funde con el fondo
            float glow = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, glow * uOpacity);
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    // Ciclo lento: ~90s para cruzar toda la pantalla de un lado a otro
    const t = state.clock.getElapsedTime() * 0.035;
    const { camera } = state;

    // x: recorre de izquierda a derecha en espacio local de cámara
    // y: deriva vertical leve, para que no sea un recorrido en línea recta
    // z: bien alejado, para que el plano se vea pequeño y sutil, no invasivo
    localOffset.set(Math.sin(t) * 3.5, Math.sin(t * 0.6) * 1.2, -14);

    meshRef.current.position.copy(localOffset).applyMatrix4(camera.matrixWorld);
    meshRef.current.quaternion.copy(camera.quaternion);

    // Respiración de opacidad muy leve — nunca desaparece del todo,
    // por eso el piso mínimo es alto (0.14) y el rango de variación es chico.
    material.uniforms.uOpacity.value = 0.18 + Math.sin(t * 3.0) * 0.06;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={997}>
      <planeGeometry args={[4, 4]} />
    </mesh>
  );
}

// ============================================
// 4. COMPONENTE PRINCIPAL
// ============================================
export const Environment = () => {
  const { scene } = useThree();

  useMemo(() => {
    scene.background = new THREE.Color(0x03030a);
    scene.fog = new THREE.FogExp2(0x03030a, 0.012);
  }, [scene]);

  return (
    <>
      <DeepSpaceStars />
      <CinematicOrbitalLight />
      <AmbientSweep />

      <ambientLight intensity={0.4} color="#4455aa" />
    </>
  );
};