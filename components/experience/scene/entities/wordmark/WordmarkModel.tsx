// components/experience/scene/entities/wordmark/WordmarkModel.tsx
//
// Carga aventhra-wordmark-cables.glb — CONFIRMADO inspeccionando el JSON
// del GLB (no asumido): un único árbol "AVENTHRA_wordmark_cabled" donde
// SOLO las dos "A" de los extremos (letter_1_A, letter_8_A) tienen, como
// hijo propio, un nodo "cable_letter_N_A" ya modelado por el artista
// (conduit, armors, joints, luces, socket) — las 6 letras del medio (V, E,
// N, T, H, R) no tienen cable propio.
//
// Antes (WordmarkCabled.tsx, renombrado) esos 2 nodos se animaban cayendo
// desde un offset. Ya NO: el usuario pidió explícitamente quitar el
// "cuelgue de cables" y que el wordmark flote entero como el robot en su
// lugar (esa flotación vive en el padre, MobileWordmarkScene.tsx, que ya
// es quien mueve el <group> cuadro a cuadro). Este componente solo oculta
// esos 2 nodos por completo — dejarlos visibles sin animación se vería
// como cables clavados a medio camino, sin sentido.
//
// Deliberadamente NO se usa también aventhra-wordmark.glb (el wordmark
// SIN cables): este archivo ya contiene el wordmark completo por dentro
// (los nodos letter_N_X son idénticos), así que cargar el otro GLB además
// solo duplicaría ~900KB de geometría de letras ya presente acá.
//
// Sin ref propia, mismo motivo que el resto de entidades de esta escena:
// el padre (MobileWordmarkScene.tsx) envuelve esto en su propio <group>
// animado — este componente solo es responsable de lo que pasa DENTRO del
// modelo (material, chispas, ocultar los nodos de cable).
'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import {
  attachSparkOverlays,
  disposeSparkOverlays,
  type SparkOverlayHandle,
} from '@/components/experience/scene/entities/shared/attachSparkOverlays';
import { applyBodyMaterial } from '@/components/experience/scene/entities/shared/applyBodyMaterial';
import { EXPERIENCE_CONFIG } from '@/core/config/experience.config';

interface WordmarkModelProps {
  sparksEnabled: boolean;
}

export function WordmarkModel({ sparksEnabled }: WordmarkModelProps) {
  const { scene } = useGLTF('/models/aventhra-wordmark-cables.glb');
  const overlaysRef = useRef<SparkOverlayHandle[]>([]);

  useEffect(() => {
    // REVERTIDO tras feedback real en celular: "los cables, los estoy
    // viendo". El intento anterior ocultaba solo la geometría ESTRUCTURAL
    // del cable (conduit/armor/joint/socket) y dejaba visibles los nodos
    // *_light/*_socket_light, asumiendo que eran puntos de luz "puros" —
    // pero en pantalla real se seguían leyendo como pedazos de cable
    // (el artista los modeló como conectores/piezas con cuerpo propio
    // alrededor del punto de luz, no como un pointLight sin geometría).
    // Sin herramienta de screenshot/browser para verificarlo yo mismo, la
    // corrección segura por construcción es ocultar el nodo raíz
    // "cable_letter_*" COMPLETO otra vez (solo existe en letter_1_A y
    // letter_8_A) — object.visible=false en tres.js también salta a sus
    // hijos al recorrer la lista de render, así que esto garantiza CERO
    // geometría de cable visible, sin depender de adivinar qué sub-malla
    // es "solo luz".
    //
    // Esto NO apaga las chispas: attachSparkOverlays (patrón /chip|light/i)
    // también encuentra los nodos "*_chip"/"*_chip_back" que CADA letra
    // trae en sus propios bars (confirmado en el JSON del GLB: 30 nodos
    // _chip/_chip_back repartidos en las 8 letras — más numerosos que los
    // 4 nodos de luz del cable que se estaban usando antes), y esos son
    // hermanos de "letter_N_X", no descendientes de "cable_letter_*" —
    // siguen intactos y visibles. El resultado es chispas repartidas por
    // TODO el wordmark en vez de concentradas en las 2 "A".
    scene.traverse((child) => {
      if (child.name.startsWith('cable_letter_')) {
        child.visible = false;
      }
    });

    // 🎨 Mismo color que el robot, pero metalness/roughness AJUSTADOS acá
    // (no los de EXPERIENCE_CONFIG.robot — el robot en desktop no se
    // toca). Causa real confirmada en pantalla: con el metalness alto del
    // robot (0.55), el reflejo especular depende del ángulo cámara↔
    // superficie — cuando el wordmark sube de 'appear' (centro) a
    // 'settled' (arriba), ese ángulo cambia porque la cámara es fija y el
    // objeto se mueve, así que el brillo "salta" aunque ninguna luz ni la
    // calidad cambien (ya descartado: calidad fija en Ultra, luces con
    // offset fijo en unidades de mundo, no atadas a fase/posición). Es
    // física real del material metálico, no un bug de una variable
    // suelta. Bajar metalness y subir roughness reduce cuánto pesa ese
    // reflejo especular direccional — prioriza "mismo color siempre"
    // (pedido explícito y repetido) por sobre el brillo metálico exacto
    // del robot.
    // Punto medio tras feedback real comparando capturas ("Ultra" original
    // 0.55/0.28 vs. la primera pasada 0.15/0.75): 0.15/0.75 sí eliminó la
    // variación pero se veía notablemente más plano/mate que el look que
    // le gustó al usuario. Se acerca más al original — el resto de la
    // reducción de sensibilidad al ángulo se hace bajando la INTENSIDAD de
    // las luces direccionales (ver WORDMARK_KEY_RIM_INTENSITY_SCALE en
    // WordmarkLighting.tsx), no solo el material.
    const WORDMARK_METALNESS = 0.35;
    const WORDMARK_ROUGHNESS = 0.5;
    applyBodyMaterial(scene, {
      color: EXPERIENCE_CONFIG.robot.bodyColor,
      metalness: WORDMARK_METALNESS,
      roughness: WORDMARK_ROUGHNESS,
    });
  }, [scene]);

  useEffect(() => {
    if (!sparksEnabled) return;
    overlaysRef.current = attachSparkOverlays(scene, '#eaffff');
    return () => {
      disposeSparkOverlays(overlaysRef.current);
      overlaysRef.current = [];
    };
  }, [scene, sparksEnabled]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    overlaysRef.current.forEach(({ material }) => {
      material.uniforms.uTime.value = t;
    });
  });

  return <primitive object={scene} />;
}

useGLTF.preload('/models/aventhra-wordmark-cables.glb');
