// components/experience/scene/entities/shared/applyBodyMaterial.ts
//
// Extraído del useEffect de carga de Robot.tsx (líneas ~73-84 antes de
// este cambio): recorre un árbol y fuerza color/metalness/roughness sobre
// cada MeshStandardMaterial encontrado, SIN tocar emissive — el brillo va
// aparte (rim light + chispas por overlay), nunca aclarando el material
// base. Se comparte acá porque el wordmark mobile (WordmarkModel.tsx)
// necesita EXACTAMENTE el mismo material del robot, no una copia — "hereda
// del robot" fue instrucción explícita, no una reinterpretación.
'use client';

import { Object3D, Mesh, MeshStandardMaterial, Color } from 'three';

export interface BodyMaterialOptions {
  color: string;
  metalness: number;
  roughness: number;
}

/**
 * Recorre `root` y fuerza color/metalness/roughness sobre cada
 * MeshStandardMaterial encontrado. `predicate`, si se pasa, filtra qué
 * mallas se tocan (por defecto, todas) — así un mismo árbol puede recibir
 * dos pasadas con distinto color (ej. letras vs cables del wordmark, cuerpo
 * vs cables del robot).
 */
export function applyBodyMaterial(
  root: Object3D,
  { color, metalness, roughness }: BodyMaterialOptions,
  predicate: (child: Mesh) => boolean = () => true
) {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (!(child.material instanceof MeshStandardMaterial)) return;
    if (!predicate(child)) return;
    child.material.color = new Color(color);
    child.material.metalness = metalness;
    child.material.roughness = roughness;
  });
}
