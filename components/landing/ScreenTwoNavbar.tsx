// components/landing/ScreenTwoNavbar.tsx
//
// Navbar DEDICADO de la "Pantalla 2" — la landing real que ve el usuario.
// Reutilizable a propósito: lo montan HomeExperience.tsx (desktop, dentro
// del bloque de la Pantalla 2 — sube con ella, `sticky`), /productos,
// /contacto, /login, /solicitar-acceso, /gracias, /registro, y el Home en
// mobile (app/(experience)/(marketing)/page.tsx).
//
// DESKTOP (lg+): "isla flotante" — pill translúcida centrada, `sticky
// top-0` dentro de un contenedor h-24 (varias páginas compensan ese alto
// con `lg:min-h-[calc(100vh-6rem)]`; HomeExperience cuenta con que ocupe
// espacio en flujo). Todo en una sola fila.
//
// MOBILE/TABLET (< lg): la MISMA isla, condensada — `fixed` (no empuja
// layout, como el viejo Navbar.tsx que reemplaza acá) con logo + botón de
// menú; al tocarlo se despliega un panel con las 3 secciones + idioma +
// acceso.
//
// Los dos navbars son elementos SEPARADOS (`hidden lg:flex` / `lg:hidden`)
// en vez de uno solo con overrides `lg:` — así el de desktop queda
// idéntico al original, sin riesgo de que el orden de cascada de Tailwind
// haga ganar una clase mobile en desktop.
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogIn, Menu, X } from 'lucide-react';
import { useExperience } from '@/components/experience/providers/ExperienceProvider';
import { useSectionNav } from '@/components/landing/useSectionNav';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';
import { OrbitFrame } from '@/components/landing/OrbitFrame';

// Las 3 vistas de la landing larga (ProductosLanding): Producto (hero, id
// 'productos'), Preguntas frecuentes (id 'faq'), Planes (id 'planes').
const NAV_SECTIONS = [
  { key: 'product', id: 'productos' },
  { key: 'faq', id: 'faq' },
  { key: 'plans', id: 'planes' },
] as const;

interface ScreenTwoNavbarProps {
  className?: string;
}

export function ScreenTwoNavbar({ className = '' }: ScreenTwoNavbarProps) {
  const pathname = usePathname();
  const { actions } = useExperience();
  const t = useTranslations('nav');
  const goToSection = useSectionNav();
  const [menuOpen, setMenuOpen] = useState(false);

  // Clickear el logo SÍ vuelve a la Pantalla 1 (salida deliberada). Si ya
  // estás en Home, un <Link> a la misma ruta no navega — resetHomeIntro()
  // desbloquea el ref de HomeExperience y hace scroll a 0.
  const handleLogoClick = () => {
    setMenuOpen(false);
    if (pathname === '/') actions.resetHomeIntro();
  };

  const handleSection = (id: string) => {
    setMenuOpen(false);
    goToSection(id);
  };

  const loginLink = (
    <Link
      href="/login"
      onClick={() => setMenuOpen(false)}
      className="group flex items-center gap-2 rounded-full px-5 py-2 text-sm text-white/85 transition-colors duration-200 hover:text-white"
    >
      <LogIn
        size={15}
        strokeWidth={1.5}
        className="text-white/55 transition-colors duration-200 group-hover:text-white"
      />
      {t('login')}
    </Link>
  );

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4 lg:sticky lg:h-24 lg:items-center lg:px-6 lg:pt-0 ${className}`}
    >
      {/* ── DESKTOP — isla en una fila (markup original, sin overrides) ── */}
      <nav className="pointer-events-auto hidden items-center gap-1.5 rounded-full border border-white/15 bg-black/50 py-2 pl-8 pr-2 shadow-2xl backdrop-blur-xl lg:flex">
        <Link href="/" className="shrink-0" onClick={handleLogoClick}>
          <span className="aventhra-logo text-base tracking-[0.18em] text-white">AVENTHRA</span>
        </Link>

        <span aria-hidden className="mx-2 h-4 w-px shrink-0 bg-white/15" />

        {NAV_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => handleSection(section.id)}
            className="group relative shrink-0 px-2.5 py-1.5 text-sm font-light text-white/60 outline-none transition-colors duration-200 hover:text-white focus-visible:text-white"
          >
            {t(section.key)}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-2.5 right-2.5 h-px origin-center scale-x-0 bg-white transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
            />
          </button>
        ))}

        <span aria-hidden className="mx-2 h-4 w-px shrink-0 bg-white/15" />

        <LocaleToggle className="shrink-0 px-1" />

        <OrbitFrame
          className="ml-1 inline-block shrink-0 rounded-full"
          innerClassName="rounded-full bg-[#0b0b0f]"
          ringSize="h-[280px] w-[280px]"
        >
          {loginLink}
        </OrbitFrame>
      </nav>

      {/* ── MOBILE/TABLET — isla condensada + panel desplegable ── */}
      <nav className="pointer-events-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-black/50 shadow-2xl backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="shrink-0" onClick={handleLogoClick}>
            <span className="aventhra-logo text-base tracking-[0.18em] text-white">AVENTHRA</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            className="-mr-1 shrink-0 rounded-full p-1.5 text-white/80 transition-colors hover:text-white"
          >
            {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-white/10 px-3 pb-3 pt-2">
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => handleSection(section.id)}
                className="rounded-xl px-3 py-2.5 text-left text-[15px] font-light text-white/75 transition-colors hover:bg-white/5 hover:text-white"
              >
                {t(section.key)}
              </button>
            ))}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/10 px-3 pt-3">
              <LocaleToggle />
              <OrbitFrame
                className="inline-block shrink-0 rounded-full"
                innerClassName="rounded-full bg-[#0b0b0f]"
                ringSize="h-[220px] w-[220px]"
              >
                {loginLink}
              </OrbitFrame>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
