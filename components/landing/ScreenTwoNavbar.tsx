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
import { LogIn } from 'lucide-react';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';

// Destinos ya decididos — TODOS son rutas normales, sin casos especiales:
//   - Productos: /productos (ver ModulesShowcase.tsx). 🐛→✅ Antes era una
//     sección con ancla dentro del Home (`/#modulos`, luego
//     `/?section=modulos`) — al entrar competía con la lógica de la
//     "cortina" del Home y se alcanzaba a ver la Pantalla 1. Ahora es una
//     página aparte, exactamente igual que Soluciones/Precios/Clientes, y
//     el problema desaparece de raíz.
//   - Soluciones / Precios / Clientes: páginas placeholder nuevas, sin
//     contenido real todavía (decisión explícita: sin precios ni clientes
//     reales que mostrar).
//   - Sobre nosotros / Contáctanos: mismas etiquetas que ya usa
//     Navbar.tsx para esas mismas rutas — evita que la misma página tenga
//     dos nombres distintos según qué navbar la enlaza.
const NAV_LINKS = [
  { label: 'Productos', href: '/productos' },
  { label: 'Soluciones', href: '/soluciones' },
  { label: 'Precios', href: '/precios' },
  { label: 'Sobre nosotros', href: '/sobre-nosotros' },
  { label: 'Clientes', href: '/clientes' },
];

interface ScreenTwoNavbarProps {
  /** Clases extra para el contenedor raíz — sin uso hoy (ya no hay gate de
   * opacidad), se deja por si algún consumidor necesita ajustar algo
   * puntual sin duplicar el componente. */
  className?: string;
}

export function ScreenTwoNavbar({ className = '' }: ScreenTwoNavbarProps) {
  // Pedido explícito: que se note dónde estás parado — el link de la ruta
  // activa queda en blanco sólido en vez del white/55 apagado del resto.
  // Comparación simple por pathname — ahora TODAS las entradas del navbar
  // (Productos incluido) son rutas propias, así que cubre todos los casos.
  const pathname = usePathname();
  const { actions } = useExperience();

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
    <div
      className={`hidden lg:flex sticky top-0 inset-x-0 h-24 z-40 items-center justify-between border-b border-white/[0.06] bg-[#08090D]/80 backdrop-blur-sm px-10 xl:px-16 ${className}`}
    >
      {/* Logo — mismo tratamiento tipográfico que el resto del sitio
          (aventhra-logo, Space Grotesk vía Navbar.tsx). */}
      <Link href="/" className="block" onClick={handleLogoClick}>
        <h1 className="aventhra-logo text-[1.9rem] tracking-[0.18em] text-white">
          AVENTHRA
        </h1>
      </Link>

      {/* Centro/derecha: links de navegación. */}
      <nav className="flex items-center gap-8">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`text-[15px] font-light transition-all duration-300 hover:text-white hover:-translate-y-0.5 ${
                isActive ? 'text-white' : 'text-white/55'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Extremo derecho, separado del grupo anterior: accesos. */}
      <div className="flex items-center gap-6">
        <Link
          href="/contacto"
          className="text-[15px] font-light text-white/55 transition-colors duration-300 hover:text-white"
        >
          Contáctanos
        </Link>

        {/* Anillo girando alrededor — pedido explícito del usuario.
            IMPORTANTE: este botón NO usa el componente OrbitRing.tsx
            (ese quedó dedicado a la card de login, que es semi-
            transparente y necesitaba la técnica de SVG sin relleno). Este
            botón tiene fondo SÓLIDO (bg-[#08090D]) — nunca tuvo el
            problema de "se ve a través" que sí tuvo la card, así que se
            deja con la técnica que ya estaba confirmada funcionando bien
            acá: un div más grande con el degradado como fondo, centrado
            por `transform` (nunca mezclado con las utilidades `translate-*`
            de Tailwind v4 — bug real ya encontrado antes), recortado por
            `overflow-hidden` a la forma de la píldora. Pedido explícito
            del usuario: "que quede igual como estaba" — no tocar esto de
            nuevo salvo pedido explícito. */}
        <span className="relative inline-flex rounded-full p-[1.5px] overflow-hidden">
          <span
            aria-hidden
            className="nexora-navlogin-orbit pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] will-change-transform"
            style={{
              transform: 'translate(-50%, -50%)',
              background:
                'conic-gradient(from 0deg, #4CC2E8 0%, #A78BFA 45%, #ffffff 50%, #A78BFA 55%, #4CC2E8 100%)',
            }}
          />
          <Link
            href="/login"
            className="group relative z-10 inline-flex w-fit items-center gap-2 rounded-full bg-[#08090D] px-6 py-3 text-sm text-white/75 transition-all duration-300 hover:bg-white/5 hover:text-white"
          >
            <LogIn
              size={15}
              strokeWidth={1.5}
              className="text-white/50 transition-colors duration-300 group-hover:text-white"
            />
            Iniciar sesión
          </Link>
        </span>
      </div>
    </div>
  );
}
