// components/landing/ProductosHero.tsx
//
// Primera sección de la Pantalla 2 del Home — lo primero que se ve al
// scrollear desde la Pantalla 1 (y también lo que muestra la ruta
// /productos).
//
// Antes de scrollear SOLO se ve "A 1 click de" (grande) + las palabras que
// rotan. El párrafo y el CTA quedan un poco más abajo, CENTRADOS.
//
// El fondo de puntos ya no vive acá: es compartido (ScreenTwoBackground),
// montado por HomeExperience / cada página de Pantalla 2.
'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { RotatingWords } from '@/components/landing/RotatingWords';
import { RobotHead } from '@/components/landing/RobotHead';
import { OrbitButton } from '@/components/landing/OrbitButton';

export function ProductosHero() {
  const t = useTranslations('landing.hero');
  // El titular en inglés ("One click away from...") es bastante más largo
  // que en español y se chocaba con la cabeza del robot / se salía a 3
  // líneas. En EN se usa una escala tipográfica un paso más chica y menos
  // sangría izquierda.
  const isEn = useLocale() === 'en';
  const titleSize = isEn
    ? 'text-3xl sm:text-4xl md:text-6xl lg:text-7xl lg:ml-24 xl:ml-36 2xl:ml-52'
    : 'text-4xl sm:text-5xl md:text-7xl lg:text-8xl lg:ml-40 xl:ml-52 2xl:ml-72';

  return (
    <section
      id="productos"
      className="relative w-full overflow-hidden px-6 md:px-10 lg:px-16"
    >
      {/* Video de la cabeza del robot — en desktop, lado derecho absoluto.
          En mobile se muestra debajo del título, dentro del flujo (ver
          Bloque 1). */}
      <div className="pointer-events-none absolute right-[3%] top-[42vh] hidden h-[62vh] w-[36vw] max-w-[480px] -translate-y-1/2 lg:block">
        <RobotHead />
      </div>

      {/* Bloque 1: título (+ robot en mobile) — ocupa la primera pantalla.
          "A 1 click de..." y la palabra que rota van separadas: más aire
          vertical + la palabra sangrada como una tabulación. En desktop
          es solo el título (el robot va absoluto arriba); en mobile el
          robot se apila debajo, centrado. */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 lg:min-h-[calc(100vh-6rem)] lg:flex-row lg:justify-start lg:gap-0">
        <h1 className={`nexora-headline w-full max-w-3xl font-normal leading-[1.15] tracking-tight text-white ${titleSize}`}>
          <span className="[word-spacing:0.22em]">{t('clickPrefix')}</span>
          <span className="mt-2 ml-3 block md:ml-6">
            <RotatingWords />
          </span>
        </h1>

        <div className="pointer-events-none h-[32vh] max-h-72 w-full max-w-[240px] shrink-0 sm:max-w-xs lg:hidden">
          <RobotHead />
        </div>
      </div>

      {/* Bloque 2: gancho + CTA — CENTRADO, aparece al scrollear un poco.
          Palabras clave en blanco pleno, relleno en gris (estilo saleads). */}
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center pb-28 text-center lg:pb-40">
        <p className="aventhra-copy text-base font-normal leading-relaxed text-white/45 md:text-xl md:leading-relaxed">
          {t.rich('paragraph', {
            b: (chunks) => <span className="text-white">{chunks}</span>,
          })}
        </p>

        <OrbitButton href="/login" className="mt-10">
          {t('cta')}
          <ChevronRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </OrbitButton>
      </div>
    </section>
  );
}
