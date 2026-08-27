// components/landing/ProductosHero.tsx
//
// Primera sección de la Pantalla 2 del Home — lo primero que se ve al
// scrollear desde la Pantalla 1 (y también lo que muestra la ruta
// /productos).
//
// Izquierda: título con palabra que rota ("A 1 click de {más ventas / ...}",
// color tornasol) + gancho + CTA. La malla de puntos reactiva al mouse
// (SectionDots) vive SOLO detrás de esta columna, no detrás del video.
// Derecha: el video de la cabeza del robot.
'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { RotatingWords } from '@/components/landing/RotatingWords';
import { RobotHead } from '@/components/landing/RobotHead';
import { SectionDots } from '@/components/landing/SectionDots';

export function ProductosHero() {
  return (
    <section
      id="productos"
      className="relative w-full min-h-screen lg:min-h-[calc(100vh-6rem)] flex items-center overflow-hidden bg-black px-6 md:px-10 lg:px-16"
    >
      {/* Trazo de puntos — grande, llega hasta el borde izquierdo. Se
          desvanece hacia la derecha ANTES del robot y en los bordes de
          arriba/abajo. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[68%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_6%,black_88%,transparent_100%)]">
        <div className="h-full w-full [mask-image:linear-gradient(to_right,black_0%,black_56%,transparent_90%)]">
          <SectionDots />
        </div>
      </div>

      {/* Video de la cabeza del robot — lado derecho, detrás del texto,
          oculto en mobile/tablet. */}
      <div className="pointer-events-none absolute right-[3%] top-1/2 hidden h-[62vh] w-[36vw] max-w-[480px] -translate-y-1/2 lg:block">
        <RobotHead />
      </div>

      {/* Corrido a la derecha respecto al hero original (pedido del usuario). */}
      <div className="relative z-10 w-full max-w-xl lg:ml-40 xl:ml-52 2xl:ml-72">
        <h1 className="nexora-headline text-4xl font-normal leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
          A 1 click de
          <br />
          <RotatingWords className="mt-2" />
        </h1>

        <p className="mt-6 max-w-md text-sm font-light leading-relaxed text-white/60 md:text-base">
          AVENTHRA gestiona tus mensajes. Te damos un agente que contesta,
          ofrece y vende por ti — a toda hora, sin que muevas un dedo.
        </p>

        <div className="mt-8">
          <Link href="/contacto">
            <span className="group inline-flex items-center gap-2 rounded-full bg-[#4CC2E8] px-6 py-3 text-sm font-medium text-black transition-all hover:shadow-[0_0_30px_rgba(76,194,232,0.25)]">
              Empezar ahora
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
