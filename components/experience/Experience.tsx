'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ExperienceProvider, useExperience } from './providers/ExperienceProvider';
import { MouseProvider } from './providers/MouseProvider';
import { QualityProvider } from './providers/QualityProvider';
import { SceneContainer } from '@/components/experience/scene/SceneContainer';
import { MobileSceneContainer } from '@/components/experience/scene/MobileSceneContainer';
import { Navbar } from '@/components/landing/Navbar';
import { useViewportTier } from '@/core/hooks/useQuality';

export const Experience = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // El robot 3D real (SceneContainer/<Canvas>) queda SOLO para desktop
  // (>=1024px, breakpoint "lg"). Mobile y tablet tienen su PROPIA escena
  // 3D persistente (MobileSceneContainer → MobileWordmarkScene: el
  // wordmark completo aparece de golpe centrado en pantalla y sube a su
  // lugar final, y de ahí en adelante queda flotando como estado
  // permanente con chispas — ver ese archivo para el detalle).
  // useViewportTier() resuelve el valor real de cliente recién después de
  // hidratar (useSyncExternalStore), así que acá no hace falta ningún
  // gate manual de "mounted": no hay mismatch servidor/cliente que evitar
  // a mano.
  const tier = useViewportTier();
  const showRobot3D = tier === 'desktop';
  const pathname = usePathname();

  // Pedido explícito del usuario: "el robot y el fondo de la Pantalla 1
  // solo debe salir en el inicio, ya cuando suba la Pantalla 2 es algo
  // diferente" — cualquier ruta con su propio ScreenTwoNavbar (ver la
  // lista de abajo) EXCEPTO Home ('/', donde vive la Pantalla 1 de
  // verdad) es un entorno COMPLETAMENTE aparte: nada de robot, nada de
  // fondo 3D/estrellas. Antes el robot se montaba igual ahí (showRobot3D
  // solo miraba el tier, nunca la ruta) — eso es lo que se reportó como
  // "se buguea" al navegar a Productos/Soluciones/Precios/Clientes/Sobre
  // nosotros.
  const isBareEnvironmentRoute = matchesScreenTwoNavbar(pathname ?? '') && pathname !== '/';
  const shouldHideRobot = isBareEnvironmentRoute;
  // <main> reserva pt-24 arriba SOLO para las rutas que usan el <Navbar/>
  // genérico (fixed, fuera del flujo normal) — las rutas con
  // ScreenTwoNavbar ya reservan su propio espacio como primer elemento en
  // flujo normal (sticky en Home/HomeExperience.tsx, o simplemente el
  // primer hijo de la página en las demás), así que sumarle el pt-24 de
  // acá encima sería un hueco vacío duplicado.
  const usesGenericNavbarSpacing = !matchesScreenTwoNavbar(pathname ?? '');

  return (
    <QualityProvider>
      <MouseProvider>
        <ExperienceProvider>
          {/* 🐛 Fix de un bug real y específico de Safari/WKWebView en iOS
              (no reproducible en Chromium ni en WebKit de escritorio, por
              eso las pruebas automatizadas no lo detectaban): position:
              fixed dentro de un ancestro con overflow-hidden deja de
              anclarse al viewport real en iOS y pasa a ser relativo a ese
              ancestro. <Navbar/> usa fixed top-0/bottom-0 — antes vivía
              DENTRO del div con overflow-hidden de más abajo, junto a los
              fondos y <main>. Ahora ese div solo envuelve lo que
              realmente necesita recortarse (fondos 3D/CSS).
              🐛→✅ <main> TAMBIÉN salió de acá (antes vivía adentro): el
              mismo `overflow-hidden` rompe `position: sticky` de los hijos
              en TODOS los navegadores (no solo iOS) — encontrado en vivo
              porque ScreenTwoNavbar.tsx (sticky, dentro de HomeExperience,
              dentro de <main>) no se quedaba pegado arriba al hacer scroll.
              El z-index no cambia (Navbar ya usa z-50, <main> z-10, por
              encima del z-0 de los fondos), así que el orden en el DOM no
              afecta el apilamiento visual. */}
          <div className="relative min-h-screen w-full bg-[#08090D]">

            {/* 🐛→✅ SIN `min-h-screen` acá (a propósito, distinto de antes):
                todos los hijos de este div son `position: fixed` — nunca
                necesitaron que el padre tuviera alto propio para nada, esa
                clase era un resabio de cuando <main> (contenido normal,
                con altura real) vivía ADENTRO de este mismo div. Ahora que
                <main> salió (ver comentario de arriba), en las rutas
                "bare" (isBareEnvironmentRoute, sin SceneContainer/
                MobileSceneContainer montado) este div queda con CERO hijos
                reales — con `min-h-screen` se quedaba ocupando una
                pantalla completa de espacio en blanco igual, empujando
                <main>/ScreenTwoNavbar hacia abajo un viewport entero (bug
                real, encontrado en vivo: el navbar aparecía pegado abajo
                del todo con todo negro arriba). Sin la clase, un div vacío
                simplemente colapsa a 0 de alto — nada que empujar. */}
            <div className="relative w-full overflow-hidden">

              {/* Fondo 3D del robot — nunca se monta en mobile/tablet.
                  🐛→✅ Antes también condicionaba el montaje a
                  `mountBackgroundScene` (oculto en las páginas
                  placeholder) — eso DESMONTABA el Canvas entero al
                  navegar a una de esas rutas, y al volver a Home lo volvía
                  a montar de cero, repitiendo la animación de descenso del
                  robot (bug real reportado por el usuario: "vuelvo a
                  Productos y se abre otra vez la animación de la Pantalla
                  1" — en realidad era el robot re-animando su entrada, no
                  la Pantalla 1 en sí). El robot SIEMPRE debe quedar
                  montado en desktop (mismo criterio que layout.tsx: "la
                  animación de descenso solo se ve una vez por carga real
                  de la app") — en las páginas placeholder simplemente se
                  OCULTA con opacidad, sin desmontar nada.
                  🐛→✅ Sin `transition-opacity` (antes tenía una de 300ms):
                  el usuario reportó ver la Pantalla 1 (fondo + robot)
                  "por medio segundo" al navegar — exactamente la ventana
                  de esa transición, que dejaba el fade a medio camino
                  visible durante la navegación. El cambio de opacidad
                  ahora es instantáneo (0 → 1 o 1 → 0 de una), sin ventana
                  intermedia que se alcance a pintar. */}
              {showRobot3D && (
                <div
                  className={`fixed inset-0 z-0 ${
                    shouldHideRobot ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <SceneContainer />
                </div>
              )}

              {/* Mobile/tablet: el fondo YA NO es una capa CSS aparte
                  (Starfield.tsx, eliminado) — MobileWordmarkScene.tsx
                  monta su propio DeepSpaceStars (mismos radios que
                  desktop, ver ese archivo), así que este <Canvas> es la
                  única capa de fondo, sin duplicar geometría/gradientes.
                  Mismo criterio que arriba: se OCULTA en las páginas
                  placeholder, nunca se desmonta (evita que la escena del
                  wordmark 3D mobile reinicie su animación al volver a
                  Home). */}
              {!showRobot3D && (
                <div
                  className={`fixed inset-0 z-0 ${
                    shouldHideRobot ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <MobileSceneContainer />
                </div>
              )}

              {/* Intro 2D previa al wordmark 3D — pedido explícito: primero
                  "AVENTHRA" (texto real, heredando la tipografía del logo
                  de desktop, no el modelo 3D) aparece y se desvanece, luego
                  "Tu empleado virtual" aparece y se desvanece, y RECIÉN AHÍ
                  arranca el wordmark 3D (que hasta entonces queda oculto,
                  ver la fase 'pending' en MobileWordmarkScene.tsx). Solo
                  mobile/tablet — su propia lógica interna (timers, ver
                  MobileTextIntro más abajo) corre una sola vez al montar,
                  así que queda siempre montado igual que las escenas de
                  arriba, sin gate de `isBareEnvironmentRoute` (es
                  puramente decorativo/temporal, no hace falta ocultarlo
                  aparte). */}
              {!showRobot3D && <MobileTextIntro />}

            </div>

            {/* <main> — fuera del overflow-hidden de arriba (ver comentario
                grande al inicio del archivo: rompía tanto el fix de iOS
                como `position: sticky`). El espacio reservado arriba solo
                aplica cuando la barra horizontal de desktop existe de
                verdad (lg), mismo corte y misma altura (h-24) que Navbar.
                RevealedContent lo mantiene montado (nunca se pierde el
                estado de un form) pero invisible en mobile/tablet hasta
                que la intro 3D termine (ver el comentario en la definición
                de RevealedContent, más abajo). */}
            <RevealedContent showRobot3D={showRobot3D}>
              <main className={`relative z-10 min-h-screen pt-0 ${usesGenericNavbarSpacing ? 'lg:pt-24' : ''}`}>
                {children}
              </main>
            </RevealedContent>

            {/* Navbar genérico (Navbar.tsx). Mismo gate de reveal que el
                contenido: entra junto, no antes. ScreenTwoNavbarGate
                (adentro) lo suprime en las rutas que montan su propio
                ScreenTwoNavbar — ahora tanto en desktop como en mobile
                (la isla flotante pasó a ser responsive). */}
            <RevealedContent showRobot3D={showRobot3D}>
              <ScreenTwoNavbarGate>
                <Navbar />
              </ScreenTwoNavbarGate>
            </RevealedContent>

          </div>
        </ExperienceProvider>
      </MouseProvider>
    </QualityProvider>
  );
};

// Intro 2D previa al wordmark 3D — pedido explícito: "primero el AVENTHRA
// en la mitad de la pantalla, pero no el 3D, hereda esto de la version
// desktop [...] se desvanece, luego aparece tu empleado virtual, y ya
// cuando se desvanezca [...] debe salir el aventhra 3d arriba". Texto real
// en el DOM (no geometría 3D nueva que modelar), heredando LITERAL las
// clases del logo de desktop (Navbar.tsx: aventhra-logo, text-[1.9rem],
// tracking-[0.18em] para "AVENTHRA"; text-[10px] uppercase tracking-
// [0.35em] text-white/35 para el tagline) — mismo look, tamaño de pantalla
// completa en vez de la barra lateral angosta.
//
// Máquina de 2 pasos con temporizadores (no useFrame — esto es puro DOM/
// CSS, no vive dentro del <Canvas>): "aventhra" fade-in→hold→fade-out,
// después "tagline" el mismo ciclo, y al terminar llama a
// setMobileIntroPhase('appear') — recién ahí arranca el wordmark 3D (ver
// la fase 'pending' en MobileWordmarkScene.tsx, que lo mantiene invisible
// hasta ese momento).
const TEXT_INTRO_FADE_MS = 400;
const TEXT_INTRO_HOLD_MS = 1000;
const TEXT_INTRO_STEP_MS = TEXT_INTRO_FADE_MS + TEXT_INTRO_HOLD_MS + TEXT_INTRO_FADE_MS;

function MobileTextIntro() {
  const { actions } = useExperience();
  const [step, setStep] = useState<'aventhra' | 'tagline'>('aventhra');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms));

    // setState diferido en un setTimeout(0), no sincrónico dentro del
    // cuerpo del efecto — mismo patrón que ya usan QualityProvider.tsx y
    // SparkOverlay.tsx en este proyecto para no disparar el lint
    // react-hooks/set-state-in-effect.
    schedule(() => setVisible(true), 0);
    // "AVENTHRA": fade-in inmediato, hold, fade-out.
    schedule(() => setVisible(false), TEXT_INTRO_FADE_MS + TEXT_INTRO_HOLD_MS);

    // "Tu empleado virtual": arranca su fade-in apenas termina el fade-out
    // de arriba, mismo ciclo.
    schedule(() => {
      setStep('tagline');
      setVisible(true);
    }, TEXT_INTRO_STEP_MS);
    schedule(() => setVisible(false), TEXT_INTRO_STEP_MS + TEXT_INTRO_FADE_MS + TEXT_INTRO_HOLD_MS);

    // Recién acá arranca el wordmark 3D.
    schedule(() => actions.setMobileIntroPhase('appear'), TEXT_INTRO_STEP_MS * 2);

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🐛→✅ `transitionDuration` va por `style` inline, NO como clase
  // arbitraria de Tailwind con la variable interpolada (`duration-[${...}
  // ms]`) — mismo problema que el bug real de `top-[calc(...)]` de acá
  // arriba: Tailwind escanea el CÓDIGO FUENTE de forma estática buscando
  // el nombre de clase completo, así que un template literal con una
  // variable adentro nunca genera la regla CSS correspondiente.
  const fadeClass = `transition-opacity motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`;

  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none" aria-hidden>
      {step === 'aventhra' ? (
        <h1
          style={{ transitionDuration: `${TEXT_INTRO_FADE_MS}ms` }}
          className={`aventhra-logo text-[1.9rem] tracking-[0.18em] text-white ${fadeClass}`}
        >
          AVENTHRA
        </h1>
      ) : (
        <p
          style={{ transitionDuration: `${TEXT_INTRO_FADE_MS}ms` }}
          // Antes text-white/35 (heredado literal del tagline de desktop,
          // pensado para vivir chiquito al lado del logo en la barra
          // lateral) — acá, a pantalla completa, se veía "opaco y poco
          // visible" (feedback real). Mismo tono/grosor que "AVENTHRA":
          // aventhra-logo (misma tipografía/peso 500) + text-white sin
          // opacidad reducida.
          className={`aventhra-logo text-center text-sm uppercase tracking-[0.35em] text-white leading-5 ${fadeClass}`}
        >
          Tu empleado virtual
        </p>
      )}
    </div>
  );
}

// Gate de reveal para mobile/tablet: en desktop (showRobot3D) el contenido
// siempre está visible — ahí el patrón de reveal ya existente (Interface-
// Overlay/RobotController vía ExperienceDirector, con su propio fundido de
// UI) no se toca. En mobile/tablet, <main> Y <Navbar/> quedan invisibles
// (opacity 0 + pointer-events-none, SIN desmontar — no perder el estado de
// ningún formulario ya montado en `children`, ej. el de login) hasta que
// MobileWordmarkScene reporta fase 'settled' (wordmark ya asentado arriba),
// momento en el que ambos entran juntos con un fade
// suave (.nexora-intro-reveal, respeta prefers-reduced-motion — y bajo
// reduced motion la fase ya nace en 'settled', así que esto ni siquiera
// llega a animar: aparece de una, como pide el punto 2 del brief).
function RevealedContent({
  showRobot3D,
  children,
}: {
  showRobot3D: boolean;
  children: React.ReactNode;
}) {
  const { state } = useExperience();
  const introSettled = showRobot3D || state.mobileIntro.phase === 'settled';

  return (
    <div
      className={`nexora-intro-reveal ${introSettled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!introSettled}
    >
      {children}
    </div>
  );
}

// Rutas que tienen su PROPIO navbar de desktop (ScreenTwoNavbar.tsx: logo +
// Producto / Preguntas frecuentes / Planes + toggle de idioma + Iniciar
// sesión) en vez del <Navbar/> genérico — Home ('/'), /productos (la misma
// landing larga), y los accesos (/contacto, /login, /solicitar-acceso).
// Pedido explícito del usuario: "el robot y el fondo de la Pantalla 1
// solo debe salir en el inicio", así que ningún destino del navbar de
// Pantalla 2 puede "regenerar" la Pantalla 1 con el navbar genérico
// viejo. Se usa en dos lugares de este archivo (acá abajo y en
// `Experience`, para decidir si <main> necesita el padding-top que
// reserva espacio para el <Navbar/> genérico) — mantenida en un solo
// lugar para no desincronizar ambos usos.
//
// (Soluciones / Precios / Clientes / Sobre nosotros se eliminaron —
// su contenido vive hoy en la landing larga.)
const SCREEN_TWO_NAVBAR_ROUTES = ['/', '/productos', '/contacto', '/login', '/solicitar-acceso', '/gracias'];

// Match de ruta contra la lista de arriba, con soporte para prefijos en las
// rutas del flujo de compra que tienen segmentos dinámicos:
//   /gracias            → "pago recibido" (redirect de Wompi)
//   /registro/<token>   → formulario de alta tras pagar
// Comparten el mismo criterio de "entorno aparte": su propio
// ScreenTwoNavbar, sin robot ni fondo 3D.
function matchesScreenTwoNavbar(pathname: string): boolean {
  if (SCREEN_TWO_NAVBAR_ROUTES.includes(pathname)) return true;
  return pathname.startsWith('/registro/');
}

// Las rutas de `matchesScreenTwoNavbar` montan su PROPIO navbar
// (ScreenTwoNavbar.tsx, la isla flotante — ahora responsive: fila inline
// en desktop, pill + panel desplegable en mobile). Mostrar ADEMÁS el
// <Navbar/> genérico duplicaría la barra, así que en esas rutas este gate
// no renderiza nada. Antes solo aplicaba en desktop (la isla era
// `hidden lg:flex`); ahora aplica en todos los anchos.
//
// Home ('/') en mobile monta ScreenTwoNavbar desde su propia page.tsx
// (rama `tier !== 'desktop'`); en desktop lo hace HomeExperience.tsx.
// Fuera de esas rutas, este componente es un no-op.
function ScreenTwoNavbarGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (matchesScreenTwoNavbar(pathname ?? '')) return null;
  return <>{children}</>;
}
