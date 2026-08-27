// app/sobre-nosotros/page.tsx
//
// 🐛→✅ Agregado <ScreenTwoNavbar/> — pedido explícito del usuario: "el
// robot y el fondo de la Pantalla 1 solo debe salir en el inicio, ya
// cuando suba la Pantalla 2 es algo diferente". Antes esta página usaba el
// <Navbar/> genérico (y seguía mostrando el robot 3D de fondo, montado sin
// importar la ruta) — al llegar acá desde el navbar de Pantalla 2 se
// sentía como si "regenerara" la Pantalla 1 con un navbar distinto. Ahora
// es una ruta más de `SCREEN_TWO_NAVBAR_ROUTES` (Experience.tsx): sin
// robot, sin <Navbar/> genérico, con este navbar dedicado en su lugar —
// mismo criterio que /soluciones, /precios, /clientes.
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { ScreenTwoBackground } from '@/components/landing/ScreenTwoBackground';

export default function AboutPage() {
  return (
    <>
    <ScreenTwoBackground />
    <ScreenTwoNavbar />
    {/* lg:min-h-[calc(100vh-6rem)]: compensa el alto real que
        ScreenTwoNavbar (h-24, en flujo normal) ya ocupó arriba, para que
        este bloque + el navbar sumen exactamente 100vh — no tiene que ver
        con el <main> padre (ya no reserva padding en esta ruta, ver
        Experience.tsx). */}
    <div className="w-full flex items-center min-h-screen lg:min-h-[calc(100vh-6rem)] px-6 md:px-10 lg:px-16">
      {/* Contenedor del contenido */}
      <div className="w-full max-w-xl ml-0 lg:ml-8 xl:ml-12 2xl:ml-16">
        {/* Mismo lenguaje que HeroContent.tsx: mitad en blanco, mitad en el
            degradado de marca (cian→índigo→violeta) — pedido explícito de
            replicar ese tratamiento acá. */}
        <h1 className="text-3xl md:text-4xl font-normal text-white leading-tight">
          Construimos el empleado <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4CC2E8] via-[#818CF8] to-[#A78BFA]">
            que tu negocio necesitaba.
          </span>
        </h1>

        {/* text-white/80 solo en mobile (md: vuelve a /50) — mismo criterio
            que HeroContent.tsx ("es un poco complejo leerla" en mobile). */}
        <p className="mt-6 text-white/80 md:text-white/50 text-sm md:text-base font-light leading-relaxed">
          AVENTHRA nace de una idea simple: los negocios pequeños y medianos
          merecen la misma capacidad de respuesta 24/7 que las grandes
          empresas, sin tener que contratar un equipo completo para lograrlo.
        </p>

        <p className="mt-4 text-white/80 md:text-white/50 text-sm md:text-base font-light leading-relaxed">
          Diseñamos un empleado de inteligencia artificial que responde,
          vende, agenda y automatiza para que los dueños de negocio puedan
          enfocarse en lo que realmente importa: crecer.
        </p>
      </div>
    </div>
    </>
  );
}