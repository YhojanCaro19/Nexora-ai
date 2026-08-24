// app/sobre-nosotros/page.tsx

export default function AboutPage() {
  return (
    <div className="w-full flex items-center min-h-screen px-6 md:px-10 lg:px-16">
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
  );
}