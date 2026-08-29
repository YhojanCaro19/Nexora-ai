// components/landing/ScreenTwoNavbar.tsx
//
// Navbar DEDICADO de la "Pantalla 2" — la página real que finalmente ve el
// usuario, distinto del `Navbar.tsx` genérico compartido (que sigue
// usándose tal cual, sin tocar, en /login, /contacto, /sobre-nosotros).
// Reutilizable a propósito (no se duplica a mano): lo usa `HomeExperience.
// tsx` (como PRIMER hijo, en flujo normal, DENTRO del bloque de la
// Pantalla 2 — sube junto con ella, visible desde el instante en que
// empieza a asomar, no solo cuando ya cubre el 100% del viewport; ver el
// comentario ahí) y las 3 páginas placeholder /soluciones, /precios,
// /clientes (siempre visible ahí, son páginas normales de una sola
// pantalla).
//
// 🐛→✅ Antes era `position: fixed` + gateado por opacidad (aparecía
// recién cuando la Pantalla 2 cubría toda la pantalla) — pedido explícito
// del usuario: el navbar debe subir CON la Pantalla 2 desde que empieza a
// aparecer, no esperar a que termine de subir. `sticky top-0` logra
// exactamente eso: al ser el primer hijo del bloque de Pantalla 2, sube
// junto con el resto del contenido mientras hace scroll, y en cuanto su
// borde superior llega al borde superior de la pantalla, se queda pegado
// ahí (en vez de seguir subiendo y desaparecer de vista) — mismo
// resultado visual final que `fixed`, pero acompañando el scroll en vez
// de aparecer de golpe al final.
//
// Desktop-only (`hidden lg:flex`, mismo corte `lg` que todo el resto de la
// experiencia) — en mobile/tablet estas rutas siguen viendo el `Navbar.tsx`
// genérico (bloque mobile, sin cambios), no se construyó un equivalente
// mobile de esto a propósito: no fue pedido, y esas rutas ya tienen su
// propio navbar funcional ahí.
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogIn } from 'lucide-react';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';
import { useSectionNav } from '@/components/landing/useSectionNav';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';

// El navbar quedó reducido a las 3 vistas que realmente importan, todas
// dentro de la MISMA landing larga (ProductosLanding):
//   - Producto  → hero de la landing (id 'productos', en ProductosHero)
//   - Preguntas frecuentes → sección FAQ (id 'faq')
//   - Planes    → sección de planes (id 'planes', en Plans)
// La navegación real la resuelve useSectionNav: scroll suave si ya
// estamos en '/' o '/productos', si no navega a /productos#<id>.
// Se eliminaron Soluciones / Precios / Sobre nosotros / Clientes /
// Contáctanos (sus páginas placeholder también) — todo ese contenido vive
// hoy en la landing larga.
const NAV_SECTIONS = [
  { key: 'product', id: 'productos' },
  { key: 'faq', id: 'faq' },
  { key: 'plans', id: 'planes' },
] as const;

interface ScreenTwoNavbarProps {
  /** Clases extra para el contenedor raíz — sin uso hoy (ya no hay gate de
   * opacidad), se deja por si algún consumidor necesita ajustar algo
   * puntual sin duplicar el componente. */
  className?: string;
}

export function ScreenTwoNavbar({ className = '' }: ScreenTwoNavbarProps) {
  const pathname = usePathname();
  const { actions } = useExperience();
  const t = useTranslations('nav');
  const goToSection = useSectionNav();

  // Pedido explícito: clickear el logo SÍ debe poder volver a la Pantalla
  // 1 — es la salida deliberada, distinta de scrollear hacia arriba por
  // accidente (bloqueado en HomeExperience.tsx). Si ya estás en Home
  // ('/'), un <Link> normal a la misma ruta no dispara ninguna navegación
  // real (App Router no remonta nada) — sin este onClick, quedarías
  // atrapado en la Pantalla 2 sin forma de volver. `resetHomeIntro()`
  // (ExperienceProvider.tsx) desbloquea el ref de HomeExperience.tsx y
  // hace scroll a 0. Si NO estás en Home, no hace falta nada especial: el
  // <Link> navega de verdad a '/', que monta HomeExperience desde cero
  // (ref en `false`, scrollY en 0) — ya se ve la Pantalla 1 sola.
  const handleLogoClick = () => {
    if (pathname === '/') {
      actions.resetHomeIntro();
    }
  };

  return (
    // Barra sticky TRANSPARENTE de alto h-24 (96px) — NO se toca ese alto:
    // varias páginas de Pantalla 2 (login, contacto, solicitar-acceso)
    // compensan con `lg:min-h-[calc(100vh-6rem)]`, y HomeExperience.tsx
    // cuenta con que este componente ocupe su espacio en flujo normal.
    // Lo que cambió es lo VISUAL: en vez de una barra sólida de borde a
    // borde, una "isla flotante" centrada (pill con blur) — el resto de
    // la barra es transparente y deja ver el contenido pasar por detrás
    // (`pointer-events-none` en el contenedor, `-auto` solo en la isla).
    <div
      className={`pointer-events-none hidden lg:flex sticky top-0 inset-x-0 h-24 z-40 items-center justify-center px-6 ${className}`}
    >
      {/* Fondo translúcido a propósito (pedido del usuario: "que medio se
          vea lo que pasa atrás"): opacidad baja + blur medio — el
          contenido se percibe pasando por detrás pero el texto sigue
          legible. */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[#0b0b12]/45 py-2.5 pl-6 pr-2.5 shadow-[0_12px_44px_-12px_rgba(0,0,0,0.6)] backdrop-blur-lg">
        {/* Logo — mismo tratamiento tipográfico que el resto del sitio
            (aventhra-logo, Space Grotesk vía Navbar.tsx), más chico para
            la isla. */}
        <Link
          href="/"
          className="shrink-0 pr-1"
          onClick={handleLogoClick}
        >
          <span className="aventhra-logo text-[1.15rem] tracking-[0.2em] text-white">
            AVENTHRA
          </span>
        </Link>

        <span aria-hidden className="mx-2 h-4 w-px bg-white/10" />

        {/* Navegación por sección de la landing larga. En hover/focus no
            se dibuja una "card" alrededor (pedido del usuario): solo una
            línea fina abajo + el texto un poco más blanco. */}
        <nav className="flex items-center gap-1">
          {NAV_SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => goToSection(section.id)}
              className="group relative px-2.5 py-2 text-sm font-light text-white/55 outline-none transition-colors duration-200 hover:text-white focus-visible:text-white"
            >
              {t(section.key)}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-0.5 left-2.5 right-2.5 h-px origin-center scale-x-0 bg-white/85 transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
            </button>
          ))}
        </nav>

        <span aria-hidden className="mx-2 h-4 w-px bg-white/10" />

        <LocaleToggle className="px-1.5" />

        {/* Acceso — píldora con el anillo de degradado girando (misma
            técnica confirmada del navbar anterior: un <span> grande con
            el conic-gradient de fondo, centrado por `transform`, recortado
            por `overflow-hidden` a la píldora; nunca mezclar con las
            utilidades `translate-*` de Tailwind v4). Fondo sólido, así que
            no necesita la variante SVG de OrbitRing.tsx. */}
        <span className="relative ml-1 inline-flex overflow-hidden rounded-full p-[1.5px]">
          <span
            aria-hidden
            className="nexora-navlogin-orbit pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] will-change-transform"
            style={{
              transform: 'translate(-50%, -50%)',
              background:
                'conic-gradient(from 0deg, #4CC2E8 0%, #A78BFA 45%, #ffffff 50%, #A78BFA 55%, #4CC2E8 100%)',
            }}
          />
          <Link
            href="/login"
            className="group relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-[#0b0b12] px-5 py-2 text-sm text-white/80 transition-colors duration-300 hover:bg-white/5 hover:text-white"
          >
            <LogIn
              size={15}
              strokeWidth={1.5}
              className="text-white/50 transition-colors duration-300 group-hover:text-white"
            />
            {t('login')}
          </Link>
        </span>
      </div>
    </div>
  );
}
