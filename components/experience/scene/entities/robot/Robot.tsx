// components/experience/scene/entities/robot/Robot.tsx
'use client';

import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { forwardRef, useEffect, useRef, type RefObject } from 'react';
import {
  Group,
  Box3,
  Vector3,
  Quaternion,
  Mesh,
  MeshStandardMaterial,
  Color,
  Bone,
  LoopPingPong,
} from 'three';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';
import { easeOutCubic } from '@/lib/math';

// Huesos que se posan durante el descenso y se "abren" a su posición normal
// en sincronía con la soltada de cables. Solo cabeza/cuello — el bind pose
// del modelo ya trae los brazos pegados al cuerpo de por sí (se vio en la
// herramienta donde se generó), así que no hace falta forzarlos: el intento
// de "recogerlos" con hombro/codo salió con el eje/signo equivocado y los
// mandó para afuera en vez de acercarlos. Mejor no tocarlos que adivinar mal
// otra vez.
const POSE_BONES: Array<{ name: string; axis: 'x' | 'y' | 'z'; angle: number }> = [
  { name: 'head', axis: 'x', angle: EXPERIENCE_CONFIG.entryAnimation.headTiltAngle },
  { name: 'neck', axis: 'x', angle: EXPERIENCE_CONFIG.entryAnimation.headTiltAngle * 0.4 },
];

// Los 6 huesos de cable que ya trae el propio modelo (su "cola" permanente).
// idle_breathe los animaba mal (se veían girando feo cerca de los tobillos),
// así que se ignora esa animación y en su lugar se les da un balanceo propio,
// suave, tipo cable colgando con corriente de aire — no un giro raro, pero
// tampoco completamente quietos. Cada uno con su propia frecuencia/fase para
// que no se muevan todos en bloque, en el mismo espíritu que los destellos
// de CablePulseShader.tsx.
const CABLE_BONE_NAMES = ['cable_01', 'cable_02', 'cable_03', 'cable_04', 'cable_05', 'cable_06'];
// El pivote de cada hueso queda justo en la zona del tobillo, así que
// CUALQUIER rotación se nota ahí primero (es lo que se veía mal con
// idle_breathe). Amplitud mínima y un solo eje — apenas un temblor, no un
// balanceo visible.
const CABLE_SWAY_AMPLITUDE = 0.015; // radianes

interface PoseBone {
  bone: Bone;
  axis: 'x' | 'y' | 'z';
  angle: number;
}

interface CableBone {
  bone: Bone;
  position: Vector3;
  bindQuaternion: Quaternion;
  // Fase/frecuencia propias, derivadas del índice — así cada cable se mece
  // en su propio momento en vez de todos a la vez.
  phase: number;
  speed: number;
}

interface RobotProps {
  /** true cuando terminó el descenso por cables — recién ahí arranca la
   * animación idle horneada en el rig (idle_breathe). */
  arrived: boolean;
  /** 0→1: progreso de la soltada — la pose de "colgando" (cabeza, brazos)
   * se abre en sincronía con esto. */
  releaseProgressRef: RefObject<number>;
}

export const Robot = forwardRef<Group, RobotProps>(({ arrived, releaseProgressRef }, ref) => {
  const { actions: experienceActions } = useExperience();
  const { scene, animations } = useGLTF('/models/nexora-robot.glb');
  const { actions } = useAnimations(animations, scene);

  const poseBonesRef = useRef<PoseBone[]>([]);
  const cableBonesRef = useRef<CableBone[]>([]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
          child.material.color = new Color(EXPERIENCE_CONFIG.robot.bodyColor);
          child.material.metalness = EXPERIENCE_CONFIG.robot.bodyMetalness;
          child.material.roughness = EXPERIENCE_CONFIG.robot.bodyRoughness;
          // Sin emissive: el material queda exactamente como estaba. El
          // detalle cyan va solo por iluminación (rim light + halo en
          // Lighting.tsx), no aclarando el propio material del cuerpo.
        }
      });

      poseBonesRef.current = POSE_BONES.map(({ name, axis, angle }) => {
        const bone = scene.getObjectByName(name) as Bone | undefined;
        return bone ? { bone, axis, angle } : null;
      }).filter((b): b is PoseBone => b !== null);

      cableBonesRef.current = CABLE_BONE_NAMES.map((name, i) => {
        const bone = scene.getObjectByName(name) as Bone | undefined;
        if (!bone) return null;
        return {
          bone,
          position: bone.position.clone(),
          bindQuaternion: bone.quaternion.clone(),
          phase: i * 1.8,
          speed: 0.7 + i * 0.15,
        };
      }).filter((b): b is CableBone => b !== null);

      // 🔍 Medimos el bounding box real del modelo para saber su tamaño exacto.
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);

      console.log('📏 Robot bounding box — size:', size, 'center:', center);
      console.log('📏 Altura total (Y):', size.y, '| Top Y:', box.max.y, '| Back Z:', box.min.z);

      experienceActions.onModelLoaded();
    }
  }, [scene, experienceActions]);

  // 🎬 Movimiento real del rig (no solo matemática de grupo en RobotAnimator):
  // arranca el loop de respiración horneado en el .glb apenas se sueltan
  // los cables de descenso. LoopPingPong en vez del LoopRepeat por defecto:
  // el clip no está garantizado a cerrar en loop perfecto (primer y último
  // frame no calzan exactos), y con LoopRepeat eso se ve como un "corte" al
  // reiniciar. PingPong nunca salta — invierte la dirección, sin costuras.
  useEffect(() => {
    if (!arrived) return;
    const idle = actions['idle_breathe'];
    if (idle) {
      idle.setLoop(LoopPingPong, Infinity);
      idle.reset().fadeIn(0.5).play();
    }
    return () => {
      idle?.fadeOut(0.3);
    };
  }, [arrived, actions]);

  useFrame((state) => {
    // Los cables propios del modelo: posición fija en su bind pose, pero con
    // un balanceo leve por encima (no la animación horneada, que se veía
    // mal) — cada uno con su fase/velocidad para que no se muevan en bloque.
    const t = state.clock.getElapsedTime();
    cableBonesRef.current.forEach(({ bone, position, bindQuaternion, phase, speed }) => {
      bone.position.copy(position);
      bone.quaternion.copy(bindQuaternion);
      bone.rotateX(Math.sin(t * speed + phase) * CABLE_SWAY_AMPLITUDE);
    });

    const release = releaseProgressRef.current ?? (arrived ? 1 : 0);
    if (arrived && release >= 1) return; // ya soltado del todo: que mande idle_breathe, no lo pisamos

    const poseProgress = arrived ? 1 - easeOutCubic(release) : 1;
    poseBonesRef.current.forEach(({ bone, axis, angle }) => {
      bone.rotation[axis] = angle * poseProgress;
    });
  });

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
});

Robot.displayName = 'Robot';
