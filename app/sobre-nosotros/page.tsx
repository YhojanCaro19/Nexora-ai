// app/sobre-nosotros/page.tsx
export default function AboutPage() {
  return (
    <div className="px-6 md:px-12 w-full max-w-2xl">
      <span className="text-[#4CC2E8] text-xs font-light tracking-[0.2em] uppercase">
        Sobre nosotros
      </span>

      <h1 className="mt-4 text-3xl md:text-4xl font-normal text-white leading-tight">
        Construimos el empleado que tu negocio necesitaba.
      </h1>

      <p className="mt-6 text-white/50 text-sm md:text-base font-light leading-relaxed">
        NEXORA AI nace de una idea simple: los negocios pequeños y medianos
        merecen la misma capacidad de respuesta 24/7 que las grandes
        empresas, sin tener que contratar un equipo completo para lograrlo.
      </p>

      <p className="mt-4 text-white/50 text-sm md:text-base font-light leading-relaxed">
        Diseñamos un empleado de inteligencia artificial que responde,
        vende, agenda y automatiza — para que los dueños de negocio puedan
        enfocarse en lo que realmente importa: crecer.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-6 max-w-md">
        <div>
          <span className="block text-2xl font-light text-white">24/7</span>
          <span className="block text-white/40 text-xs mt-1">Disponibilidad total</span>
        </div>
        <div>
          <span className="block text-2xl font-light text-white">100%</span>
          <span className="block text-white/40 text-xs mt-1">Automatizado</span>
        </div>
      </div>
    </div>
  );
}