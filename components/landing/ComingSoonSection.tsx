// components/landing/ComingSoonSection.tsx
//
// Contenido de las 3 páginas placeholder (/soluciones, /precios,
// /clientes) — temporal, sin datos ni features inventados (decisión
// explícita: sin precios definidos ni clientes reales todavía). El
// contenido real de cada una es una tarea aparte, a futuro.
//
// Mismo layout que ya usan HeroContent.tsx/sobre-nosotros/contacto para
// contenido de una sola pantalla: bloque de texto alineado a la
// izquierda, centrado verticalmente contra el alto real que queda debajo
// de la barra de desktop (lg:min-h-[calc(100vh-6rem)]).
export function ComingSoonSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="w-full flex items-center min-h-screen lg:min-h-[calc(100vh-6rem)] px-6 md:px-10 lg:px-16">
      <div className="w-full max-w-xl ml-0 lg:ml-8 xl:ml-12 2xl:ml-16">
        <h1 className="text-3xl md:text-4xl font-normal text-white leading-tight">
          {title}
        </h1>

        <p className="mt-6 text-white/80 md:text-white/50 text-sm md:text-base font-light leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
