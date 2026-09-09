"use client";

// Envoltorio cliente del onboarding. Vive en el layout (server) y provee un
// canal para que el wizard decida CUÁNDO se ve la estela de color:
//
//   welcome            → sin estela (fondo limpio, el robot flota sobre las
//                        estrellas)
//   form / submitting  → estela centrada y fuerte, telón del formulario
//   done
//
// La estela se monta acá —como hermana ANTES del contenedor del contenido,
// igual que cuando estaba directa en el layout— para conservar el orden de
// pintado (estrellas → estela → contenido). Moverla dentro del wizard la
// dejaba por encima del formulario (el contenedor del wizard no puede
// llevar `z-*`: aislaría el mix-blend-mode del robot en el welcome).
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { OnboardingEstela } from "./onboarding-estela";

const SetEstelaContext = createContext<(visible: boolean) => void>(() => {});

/** El wizard llama esto con `screen !== "welcome"`. Al desmontar, oculta. */
export function useOnboardingEstela(visible: boolean) {
  const setVisible = useContext(SetEstelaContext);
  useEffect(() => {
    setVisible(visible);
    return () => setVisible(false);
  }, [visible, setVisible]);
}

export function OnboardingShell({ children }: { children: ReactNode }) {
  const [estelaVisible, setEstelaVisible] = useState(false);
  return (
    <SetEstelaContext.Provider value={setEstelaVisible}>
      {estelaVisible && <OnboardingEstela />}
      {children}
    </SetEstelaContext.Provider>
  );
}
