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

import { Group, Mesh, ShaderMaterial, Vector3 } from 'three';
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
    // uPulseSpeed/uIgniteThreshold YA NO se fijan acá — pasaron a ser
    // dinámicos por fase (mucha intensidad en 'appear'/'rise', bajan en
    // 'settled', ver WordmarkModel.tsx y las constantes SPARK_INTENSITY
    // ahí). Este archivo solo crea el material con los defaults de
    // createSparkOverlayMaterial (1.0 / 0.975, los del robot) — quien
    // llama decide si los pisa.
    overlay.material = material;
    overlay.name = `${child.name}__spark`;
    overlay.userData.isSparkOverlay = true;
    // El robot NO pasa por esta función (arma sus propios destellos a
    // mano en DescentCables.tsx, con su propia geometría) — este scale
    // solo afecta al wordmark, que sí llama a attachSparkOverlays(). Los
    // nodos "*_chip" del GLB son piezas de detalle pensadas para un
    // modelo a escala completa; en el wordmark, escalado a ~0.1 de su
    // tamaño natural, el destello quedaba tan chico que era imperceptible.
    //
    // 🐛→✅ El primer intento (mesh.scale.multiplyScalar(N) sin más) se
    // veía "horrible... no sale directamente del título, sale como
    // alrededor" — feedback real correcto: three.js escala una malla
    // alrededor de su ORIGEN LOCAL, no de su centro visual. Si el pivote
    // de la pieza (definido por el artista en el GLB) no está exactamente
    // en el centro de su geometría, agrandarla la corre hacia un lado en
    // vez de crecer desde el mismo lugar — se "explota" lejos de la letra.
    // Fix: calcular el centro real de la geometría (bounding box, en el
    // espacio local de la malla) y compensar la posición para que el
    // punto que se ve crecer sea ESE centro, no el origen del pivote.
    const SPARK_SCALE = 8;
    overlay.geometry.computeBoundingBox();
    const localCenter = new Vector3();
    overlay.geometry.boundingBox?.getCenter(localCenter);
    // Cuánto se desplaza ese centro al escalar alrededor del origen local
    // — en el espacio LOCAL de la malla (antes de su propia rotación).
    const centerShiftLocal = localCenter.clone().multiplyScalar(SPARK_SCALE - 1);
    // La `position` de la malla vive en el espacio de su padre, así que el
    // desplazamiento hay que rotarlo con la orientación de la malla antes
    // de restarlo (escala uniforme, así que rotación y escala conmutan).
    centerShiftLocal.applyQuaternion(overlay.quaternion);
    overlay.position.sub(centerShiftLocal);
    overlay.scale.multiplyScalar(SPARK_SCALE);

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
