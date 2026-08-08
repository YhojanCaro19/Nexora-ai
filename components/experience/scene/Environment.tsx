// components/experience/scene/Environment.tsx
'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useQuality } from '../providers/QualityProvider';

// ============================================
// 1. FONDO DE ESTRELLAS (Sutiles, con deriva lenta)
// ============================================
const STAR_COUNT_BY_QUALITY: Record<string, number> = {
  Ultra: 6000,
  High: 5000,
  Medium: 4000,
  Low: 2500,
};

function DeepSpaceStars() {
  const pointsRef = useRef<THREE.Points>(null);
  const { level } = useQuality();
  const starCount = STAR_COUNT_BY_QUALITY[level] ?? 4000;

  const geometry = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
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
  }, [starCount]);

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
// 3. ESTRELLAS FUGACES
// ============================================
// Reemplaza al antiguo "AmbientSweep" (un brillo que cruzaba la pantalla sin
// parar). En vez de un barrido continuo, cada instancia es un cometa que
// aparece de golpe, cruza rápido una porción del cielo y se apaga — con un
// tiempo de espera aleatorio antes de volver a lanzarse. `seed` desfasa el
// primer lanzamiento de cada una para que no disparen todas a la vez.
function ShootingStar({ seed }: { seed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color('#eef0f7') },
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
            // Cabeza brillante en x=1, cola que se desvanece hacia x=0.
            float head = smoothstep(0.0, 1.0, vUv.x);
            float thickness = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5));
            float alpha = head * head * thickness * uOpacity;
            gl_FragColor = vec4(uColor, alpha);
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

  const cycle = useRef({
    flying: false,
    progress: 0,
    cooldown: 3 + seed * 4 + Math.random() * 4,
    durationSec: 0.8,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });

  useFrame((_state, delta) => {
    const c = cycle.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!c.flying) {
      c.cooldown -= delta;
      if (c.cooldown <= 0) {
        // Nueva trayectoria: entra desde arriba-izquierda, cruza en diagonal.
        const originX = -20 + Math.random() * 14;
        const originY = 10 + Math.random() * 6;
        const z = -18 - Math.random() * 14;
        const length = 12 + Math.random() * 8;
        const angle = 0.55 + (Math.random() - 0.5) * 0.3;

        c.start.set(originX, originY, z);
        c.end.set(originX + Math.cos(-angle) * length, originY - Math.sin(angle) * length, z);
        c.progress = 0;
        c.durationSec = 0.6 + Math.random() * 0.5;
        c.flying = true;
      } else {
        material.uniforms.uOpacity.value = 0;
        return;
      }
    }

    c.progress += delta / c.durationSec;
    if (c.progress >= 1) {
      c.flying = false;
      c.cooldown = 5 + Math.random() * 9;
      material.uniforms.uOpacity.value = 0;
      return;
    }

    const pos = c.start.clone().lerp(c.end, c.progress);
    mesh.position.copy(pos);

    const dir = c.end.clone().sub(c.start).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

    // Entra rápido, se apaga al llegar al final del recorrido.
    const fadeIn = Math.min(1, c.progress * 8);
    const fadeOut = Math.min(1, (1 - c.progress) * 3);
    material.uniforms.uOpacity.value = fadeIn * fadeOut;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={998}>
      <planeGeometry args={[2.4, 0.06]} />
    </mesh>
  );
}

const SHOOTING_STAR_COUNT_BY_QUALITY: Record<string, number> = {
  Ultra: 4,
  High: 4,
  Medium: 3,
  Low: 2,
};

function ShootingStars() {
  const { level } = useQuality();
  const count = SHOOTING_STAR_COUNT_BY_QUALITY[level] ?? 3;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ShootingStar key={i} seed={i} />
      ))}
    </>
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
      <ShootingStars />

      <ambientLight intensity={0.4} color="#4455aa" />
    </>
  );
};
