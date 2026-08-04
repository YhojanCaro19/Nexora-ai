// components/landing/NexoraRobotHead.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function RobotHead({ onArrived }: { onArrived: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const eyeLGlow = useRef<THREE.PointLight>(null);
  const eyeRGlow = useRef<THREE.PointLight>(null);
  const target = useRef({ x: 0, y: 0 });

  // 🔥 Entrada: arranca lejos en Z (profundidad) y se acerca en línea recta.
  // X e Y se quedan en 0 — nunca entra desde un lado, solo "se acerca".
  const currentZ = useRef(-14);
  const targetZ = useRef(0);
  const arrivedRef = useRef(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Acercamiento (dolly-in): easing lento, sin mover X.
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ.current, 0.025);
    groupRef.current.position.z = currentZ.current;

    if (!arrivedRef.current && Math.abs(currentZ.current - targetZ.current) < 0.05) {
      arrivedRef.current = true;
      onArrived();
    }

    const maxYaw = 0.5;
    const maxPitch = 0.28;
    const desiredYaw = target.current.x * maxYaw;
    const desiredPitch = target.current.y * maxPitch;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, desiredYaw, 0.06);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, desiredPitch, 0.06);

    const t = state.clock.getElapsedTime();
    // Bobbing vertical se suma AL currentZ ya calculado, no lo reemplaza
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.05;

    const blink = 0.6 + Math.sin(t * 2.2) * 0.15;
    if (eyeLGlow.current) eyeLGlow.current.intensity = blink * 3;
    if (eyeRGlow.current) eyeRGlow.current.intensity = blink * 3;
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color="#0d1018"
          roughness={0.25}
          metalness={0.6}
          clearcoat={1}
          clearcoatRoughness={0.15}
          reflectivity={0.6}
        />
      </mesh>

      <mesh position={[0, 0.02, 0.78]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[1.15, 0.55, 0.25]} />
        <meshPhysicalMaterial
          color="#0a1622"
          roughness={0.05}
          metalness={0.1}
          transmission={0.75}
          thickness={0.4}
          ior={1.4}
        />
      </mesh>

      <mesh position={[-0.28, 0.02, 0.92]}>
        <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
        <meshStandardMaterial color="#4CC2E8" emissive="#4CC2E8" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[0.28, 0.02, 0.92]}>
        <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
        <meshStandardMaterial color="#818CF8" emissive="#818CF8" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight ref={eyeLGlow} position={[-0.28, 0.02, 1.1]} color="#4CC2E8" intensity={2} distance={2.5} />
      <pointLight ref={eyeRGlow} position={[0.28, 0.02, 1.1]} color="#818CF8" intensity={2} distance={2.5} />

      <mesh position={[0, 0.55, 0.35]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.62, 0.008, 8, 64, Math.PI]} />
        <meshStandardMaterial color="#4CC2E8" emissive="#4CC2E8" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>

      <NeuralCore />
    </group>
  );
}

function NeuralCore() {
  const ref = useRef<THREE.Points>(null);
  const count = 60;
  const positions = useRef<Float32Array>(
    (() => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = 0.28 * Math.cbrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        arr[i * 3 + 2] = 0.55 + r * Math.cos(phi) * 0.5;
      }
      return arr;
    })()
  );

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.4;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#a5b4fc" size={0.02} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

// 🔥 Fondo: partículas dentro del MISMO canvas — antes Environment.tsx
// vivía en un Canvas que nunca se montaba, por eso nunca veías nada.
function AmbientDust() {
  const ref = useRef<THREE.Points>(null);
  const count = 120;
  const positions = useRef<Float32Array>(
    (() => {
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 8;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 10 - 4;
      }
      return arr;
    })()
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * 0.01;
    (ref.current.material as THREE.PointsMaterial).opacity = 0.2 + Math.sin(t * 0.3) * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#9fd8e8"
        size={0.012}
        sizeAttenuation
        transparent
        opacity={0.2}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export const NexoraRobotHead = () => {
  const [mounted, setMounted] = useState(false);
  const [arrived, setArrived] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-full aspect-square max-w-[560px]" />;

  return (
    <div className="w-full aspect-square max-w-[560px]">
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} color="#e8f4ff" />
        <directionalLight position={[-3, -2, -4]} intensity={0.3} color="#818CF8" />
        <AmbientDust />
        <RobotHead onArrived={() => setArrived(true)} />
      </Canvas>
    </div>
  );
};