// core/director/ExperienceDirector.ts
import { useReducer, useCallback, useRef, useEffect } from 'react';
import { ExperiencePhase, ExperienceState, ExperienceAction } from '@/types/experience.type';

const initialState: ExperienceState = {
  phase: ExperiencePhase.LOADING,
  progress: 0,
  isInteractive: false,
};

function reducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case 'SET_PHASE':
      if (state.phase === action.payload) return state;
      const isInteractive = action.payload === ExperiencePhase.INTERACTIVE;
      return { ...state, phase: action.payload, isInteractive };
    case 'SET_PROGRESS':
      return { ...state, progress: Math.min(1, Math.max(0, action.payload)) };
    default:
      return state;
  }
}

export const useExperienceDirector = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isModelLoadedRef = useRef(false);

  const setPhase = useCallback((phase: ExperiencePhase) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  }, []);

  const setProgress = useCallback((progress: number) => {
    dispatch({ type: 'SET_PROGRESS', payload: progress });
  }, []);

  // Definimos la función startSequence con useCallback para que sea estable
  const startSequence = useCallback(() => {
    if (state.phase === ExperiencePhase.LOADING) {
      setPhase(ExperiencePhase.REVEAL_SCENE);
      startTimeRef.current = performance.now();
    }
  }, [state.phase, setPhase]);

  // Efecto principal
  useEffect(() => {
    const updateProgress = () => {
      if (!startTimeRef.current) return;

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const totalRevealDuration = 1.8;
      let progress = Math.min(elapsed / totalRevealDuration, 1);
      setProgress(progress);

      if (progress >= 1 && state.phase === ExperiencePhase.REVEAL_SCENE) {
        setPhase(ExperiencePhase.REVEAL_UI);
      } 
      else if (progress >= 1 && state.phase === ExperiencePhase.REVEAL_UI) {
        setPhase(ExperiencePhase.INTERACTIVE);
      }

      if (state.phase !== ExperiencePhase.INTERACTIVE) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    if (state.phase === ExperiencePhase.REVEAL_SCENE) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.phase, setPhase, setProgress]);

  return {
    state,
    actions: {
      setPhase,
      setProgress,
      onModelLoaded: startSequence, // Ahora startSequence está definida correctamente
    },
  };
};