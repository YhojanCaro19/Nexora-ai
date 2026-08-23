// components/experience/scene/entities/shared/attachSparkOverlays.ts
//
// Mismo criterio que ya usa DescentCables.tsx para los cables del robot:
// el shader de chispas (createSparkOverlayMaterial) NUNCA reemplaza el
// material original de una pieza — vive en una malla clonada ENCIMA,
// transparente salvo en los destellos puntuales, para que la pieza de
// abajo conserve su apariencia PBR normal (incluido su emissive ya
// horneado) todo el tiempo.
//
// Acá se generaliza esa idea para las mallas importadas del GLB del
// wordmark mobile (aventhra-wordmark-cables.glb): en vez de armar
// los cables/chispas a mano como en el robot, se recorre la escena ya
// cargada y se clona cualquier malla cuyo NOMBRE indique que es una pieza
// "de energía" (los artistas ya las llamaron *_chip, *_light*, siguiendo
// la convención AVX_ del resto del modelo) — no hay que adivinar
// posiciones ni geometría, el GLB ya la tiene.
'use client';

import { Group, Mesh, ShaderMaterial } from 'three';
import { createSparkOverlayMaterial } from '@/components/experience/scene/cables/CablePulseShader';

// case-insensitive: cubre "*_chip", "*_chip_back", "*_light_ring_*",
// "cable_light_*", "cable_socket_light".
const SPARK_NAME_PATTERN = /chip|light/i;

export interface SparkOverlayHandle {
  mesh: Mesh;
  material: ShaderMaterial;
  /** Malla original de la que se clonó — disposeSparkOverlays() la usa
   * para bajar userData.hasSparkOverlay de nuevo, así un remount (Fast
   * Refresh en desarrollo) puede volver a agregar el overlay en vez de
   * quedarse sin chispas para siempre por el guard de duplicados. */
  source: Mesh;
}

/**
 * Recorre `root` y clona cada malla "de energía" con una capa de chispas
 * encima. Idempotente: si se llama dos veces sobre el mismo árbol (ej.
 * Fast Refresh en desarrollo remontando el efecto que la llama), no
 * duplica overlays ya puestos — marca cada malla original con
 * `userData.hasSparkOverlay`.
 *
 * Devuelve los handles para que quien llama pueda actualizar `uTime` en
 * su propio useFrame y hacer dispose() al desmontar.
 */
export function attachSparkOverlays(root: Group, hotColor = '#eaffff'): SparkOverlayHandle[] {
  const overlays: SparkOverlayHandle[] = [];

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (child.userData.hasSparkOverlay) return;
    if (!SPARK_NAME_PATTERN.test(child.name)) return;

    const overlay = child.clone();
    const material = createSparkOverlayMaterial(hotColor);
    overlay.material = material;
    overlay.name = `${child.name}__spark`;
    overlay.userData.isSparkOverlay = true;

    child.userData.hasSparkOverlay = true;
    child.parent?.add(overlay);

    overlays.push({ mesh: overlay, material, source: child });
  });

  return overlays;
}

export function disposeSparkOverlays(overlays: SparkOverlayHandle[]) {
  overlays.forEach(({ mesh, material, source }) => {
    mesh.parent?.remove(mesh);
    material.dispose();
    source.userData.hasSparkOverlay = false;
  });
}
