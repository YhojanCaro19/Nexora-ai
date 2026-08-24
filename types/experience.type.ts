// types/experience.types.ts
// Tipos para la máquina de estados (FSM).

export enum ExperiencePhase {
  LOADING = 'loading',         // El GLB se está cargando. Pantalla oscura.
  MODEL_LOADED = 'modelLoaded', // GLB cargado, pero aún no revelado.
  REVEAL_SCENE = 'revealScene', // Las luces encienden, el robot aparece.
  REVEAL_UI = 'revealUI',       // El Navbar y el Hero entran.
  INTERACTIVE = 'interactive',  // El usuario puede hacer scroll y el robot sigue al mouse.
}

export interface ExperienceState {
  phase: ExperiencePhase;
  progress: number; // 0 a 1. Útil para animaciones basadas en tiempo relativo.
  isInteractive: boolean;
}

export type ExperienceAction =
  | { type: 'SET_PHASE'; payload: ExperiencePhase }
  | { type: 'SET_PROGRESS'; payload: number };

// Fases de la escena 3D mobile/tablet (MobileWordmarkScene.tsx) — un FSM
// aparte del de arriba (ExperiencePhase es específico del robot/reveal de
// desktop, con su propia duración fija de 1.8s vía ExperienceDirector).
// 'pending': el wordmark 3D todavía NO arrancó — mientras tanto corre una
// intro 2D previa, toda en HTML (MobileTextIntro en Experience.tsx: el
// texto "AVENTHRA" aparece/desvanece, luego "Tu empleado virtual" aparece/
// desvanece), heredando el mismo look que el logo de desktop. El wordmark
// 3D queda oculto (scale 0) durante esta fase — ver MobileWordmarkScene.tsx.
// 'appear': el wordmark completo aparece de golpe (pop de escala) centrado
// en pantalla, ya con chispas. 'rise': sube desde ahí a su lugar final.
// 'settled': fase final e indefinida — todo quieto salvo la flotación
// senoidal (igual que el robot) y chispas ocasionales. Vive en
// ExperienceProvider (mobileIntro.phase) en vez de un useState local
// dentro de MobileWordmarkScene para que Experience.tsx pueda leerla desde
// afuera del <Canvas> y decidir cuándo revelar <main>/<Navbar/>.
export type MobileIntroPhase = 'pending' | 'appear' | 'rise' | 'settled';