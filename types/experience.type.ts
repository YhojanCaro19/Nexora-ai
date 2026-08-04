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