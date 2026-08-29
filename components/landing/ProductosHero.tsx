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
import { RotatingWords } from '@/components/landing/RotatingWords';
import { RobotHead } from '@/components/landing/RobotHead';
import { OrbitButton } from '@/components/landing/OrbitButton';

export function ProductosHero() {
  return (
    <section
      id="productos"
      className="relative w-full overflow-hidden px-6 md:px-10 lg:px-16"
    >
      {/* Video de la cabeza del robot — lado derecho, oculto en mobile. */}
      <div className="pointer-events-none absolute right-[3%] top-[42vh] hidden h-[62vh] w-[36vw] max-w-[480px] -translate-y-1/2 lg:block">
        <RobotHead />
      </div>

      {/* Bloque 1: SOLO el título — ocupa la primera pantalla completa.
          "A 1 click de..." y la palabra que rota van separadas: más aire
          vertical + la palabra sangrada como una tabulación. */}
      <div className="relative z-10 flex min-h-screen lg:min-h-[calc(100vh-6rem)] items-center">
        <h1 className="nexora-headline w-full max-w-3xl text-4xl font-normal leading-[1.15] tracking-tight text-white sm:text-5xl md:text-7xl lg:text-8xl lg:ml-40 xl:ml-52 2xl:ml-72">
          <span className="[word-spacing:0.22em]">A 1 click de...</span>
          <span className="mt-2 ml-3 block md:ml-6">
            <RotatingWords />
          </span>
        </h1>
      </div>

      {/* Bloque 2: gancho + CTA — CENTRADO, aparece al scrollear un poco.
          Palabras clave en blanco pleno, relleno en gris (estilo saleads). */}
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center pb-28 text-center lg:pb-40">
        <p className="aventhra-copy text-base font-normal leading-relaxed text-white/45 md:text-xl md:leading-relaxed">
          <span className="text-white">AVENTHRA</span> hace tu{' '}
          <span className="text-white">marketing</span> y{' '}
          <span className="text-white">atiende</span> a tus clientes. Consigue
          que te <span className="text-white">escriban</span>, responde cada
          mensaje y <span className="text-white">cierra la venta</span> — a toda
          hora.
        </p>

        <OrbitButton href="/contacto" className="mt-10">
          Empezar ahora
          <ChevronRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </OrbitButton>
      </div>
    </section>
  );
}
