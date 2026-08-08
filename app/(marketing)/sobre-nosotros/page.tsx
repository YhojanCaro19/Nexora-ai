// app/sobre-nosotros/page.tsx

export default function AboutPage() {
  return (
    <div className="w-full flex items-center min-h-screen px-6 md:px-10 lg:px-16">
      {/* Contenedor del contenido */}
      <div className="w-full max-w-xl ml-0 lg:ml-8 xl:ml-12 2xl:ml-16">
        <span className="text-[#4CC2E8] text-xs font-light tracking-[0.2em] uppercase">
          Sobre nosotros
        </span>

        <h1 className="mt-4 text-3xl md:text-4xl font-normal text-white leading-tight">
          Construimos el empleado que tu negocio necesitaba.
        </h1>

        <p className="mt-6 text-white/50 text-sm md:text-base font-light leading-relaxed">
          AVENTHRA nace de una idea simple: los negocios pequeños y medianos
          merecen la misma capacidad de respuesta 24/7 que las grandes
          empresas, sin tener que contratar un equipo completo para lograrlo.
        </p>

        <p className="mt-4 text-white/50 text-sm md:text-base font-light leading-relaxed">
          Diseñamos un empleado de inteligencia artificial que responde,
          vende, agenda y automatiza para que los dueños de negocio puedan
          enfocarse en lo que realmente importa: crecer.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-8 max-w-md">
          <div>
            <span className="block text-2xl font-light text-white">24/7</span>
            <span className="block text-white/40 text-xs mt-1">
              Disponibilidad total
            </span>
          </div>

          <div>
            <span className="block text-2xl font-light text-white">100%</span>
            <span className="block text-white/40 text-xs mt-1">
              Automatizado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}