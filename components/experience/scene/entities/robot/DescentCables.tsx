// components/experience/scene/entities/robot/DescentCables.tsx
'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, Vector3, Color } from 'three';
import { createSparkOverlayMaterial } from '@/components/experience/scene/cables/CablePulseShader';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { useQuality } from '@/components/experience/providers/QualityProvider';

// Puntos de anclaje en el robot (offsets locales, ya en tamaño final
// renderizado — hombros, nuca y espalda media), medidos a ojo sobre el
// modelo a scale 0.55. Se rotan junto con el robot cada frame.
const ANCHOR_OFFSETS: Vector3[] = [
  new Vector3(-0.15, 0.68, 0),
  new Vector3(0.15, 0.68, 0),
  new Vector3(0, 0.95, -0.08),
  new Vector3(0, 0.65, -0.1),
];

const Y_AXIS = new Vector3(0, 1, 0);
const TOP_Y_OFFSET = 3; // cuánto más arriba del punto de partida cuelga el otro extremo (fuera de cuadro)

const easeInCubic = (t: number) => t * t * t;

interface DescentCablesProps {
  baseX: number;
  endZ: number;
  rotationY: number;
  startY: number;
  /** Y actual del robot este frame (mutable, se lee en vivo). */
  currentYRef: RefObject<number>;
  /** 0→1: progreso de la "soltada" — mismo reloj que usa RobotScene para
   * desmontar este componente y que Robot.tsx usa para enderezar la cabeza. */
  releaseProgressRef: RefObject<number>;
}

export const DescentCables = ({
  baseX,
  endZ,
  rotationY,
  startY,
  currentYRef,
  releaseProgressRef,
}: DescentCablesProps) => {
  // En niveles bajos (Low) no se monta el material de destellos shader por
  // cable — se ve el cable base igual, solo sin el "chispeo" animado. Esto
  // es puramente de arranque (config.cableShaders no cambia en vivo salvo
  // que el ajuste por FPS baje el nivel mientras el robot sigue bajando,
  // caso ya cubierto: cablesMounted desmonta este componente entero poco
  // después de "arrived", así que no hay parpadeo de material a mitad de
  // una spark ya visible).
  const { config } = useQuality();
  const cableShadersEnabled = config.cableShaders;

  const baseMeshRefs = useRef<(Mesh | null)[]>([]);
  const sparkMeshRefs = useRef<(Mesh | null)[]>([]);

  // Capa 1: el cable en sí — sólido, quieto, mismo material/brillo que el
  // cuerpo del robot pero más oscuro. No cambia de color, no brilla solo.
  const baseMaterials = useMemo(
    () =>
      ANCHOR_OFFSETS.map(
        () =>
          new MeshStandardMaterial({
            color: new Color(EXPERIENCE_CONFIG.robot.cableColor),
            metalness: EXPERIENCE_CONFIG.robot.bodyMetalness,
            roughness: EXPERIENCE_CONFIG.robot.bodyRoughness,
            transparent: true,
            opacity: 1,
          })
      ),
    []
  );

  // Capa 2: destellos — encima del cable, invisible salvo cuando "chispea".
  // Se omite por completo en niveles con cableShaders=false (Medium/Low):
  // ni se crea el ShaderMaterial ni se monta el mesh que lo usa.
  const sparkMaterials = useMemo(
    () => (cableShadersEnabled ? ANCHOR_OFFSETS.map(() => createSparkOverlayMaterial('#eaffff')) : []),
    [cableShadersEnabled]
  );

  // Puntos superiores: fijos en el mundo, por encima del punto de partida.
  const topPoints = useMemo(
    () =>
      ANCHOR_OFFSETS.map((offset) => {
        const rotated = offset.clone().applyAxisAngle(Y_AXIS, rotationY);
        return new Vector3(baseX + rotated.x, startY + TOP_Y_OFFSET, endZ + rotated.z);
      }),
    [baseX, endZ, rotationY, startY]
  );

  useEffect(() => {
    return () => {
      baseMaterials.forEach((m) => m.dispose());
      sparkMaterials.forEach((m) => m.dispose());
    };
  }, [baseMaterials, sparkMaterials]);

  useFrame((state) => {
    const currentY = currentYRef.current ?? startY;
    const release = easeInCubic(releaseProgressRef.current ?? 0);

    ANCHOR_OFFSETS.forEach((offset, i) => {
      const baseMesh = baseMeshRefs.current[i];
      const baseMaterial = baseMaterials[i];
      if (!baseMesh || !baseMaterial) return;

      // Capa de destellos: solo existe (ref, material) cuando
      // cableShadersEnabled — en Low/Medium estos son undefined/null y el
      // cable base sigue actualizándose igual, solo sin "chispeo".
      const sparkMesh = sparkMeshRefs.current[i];
      const sparkMaterial = sparkMaterials[i];

      // Rotación en eje Y no toca la componente Y, así que rotated.y === offset.y.
      const rotated = offset.clone().applyAxisAngle(Y_AXIS, rotationY);
      const realBottom = new Vector3(baseX + rotated.x, currentY + rotated.y, endZ + rotated.z);
      const top = topPoints[i];

      // Al soltarse, el extremo inferior "sube" hacia el superior (se retrae)
      // en vez de solo desvanecerse en el sitio — por eso el lerp hacia `top`.
      const bottom = realBottom.clone().lerp(top, release);

      const mid = top.clone().add(bottom).multiplyScalar(0.5);
      const length = top.distanceTo(bottom);
      const direction = length > 0.0001 ? top.clone().sub(bottom).normalize() : Y_AXIS;

      // El cilindro crece por defecto a lo largo de su eje Y local, por eso
      // orientamos contra Y_AXIS (no X) y escalamos en Y (no en X).
      const meshesToUpdate = sparkMesh ? [baseMesh, sparkMesh] : [baseMesh];
      meshesToUpdate.forEach((mesh) => {
        mesh.position.copy(mid);
        mesh.quaternion.setFromUnitVectors(Y_AXIS, direction);
        mesh.scale.set(1, Math.max(length, 0.0001), 1);
      });

      baseMaterial.opacity = 1 - release;
      if (sparkMaterial) {
        sparkMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
        sparkMaterial.uniforms.uFade.value = 1 - release;
      }
    });
  });

  return (
    <>
      {ANCHOR_OFFSETS.map((_, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              baseMeshRefs.current[i] = el;
            }}
            material={baseMaterials[i]}
          >
            <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
          </mesh>
          {cableShadersEnabled && (
            <mesh
              ref={(el) => {
                sparkMeshRefs.current[i] = el;
              }}
              material={sparkMaterials[i]}
            >
              <cylinderGeometry args={[0.013, 0.013, 1, 8]} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
};
