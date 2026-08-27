// components/landing/ModulesShowcase.tsx
//
// Contenido de la página "Productos" (/productos) — enlazado desde
// ScreenTwoNavbar.tsx. Es una ruta normal más, igual que /soluciones,
// /precios y /clientes (antes vivía como una sección con ancla dentro del
// Home, lo que provocaba condiciones de carrera al entrar; ahora es una
// página aparte y punto).
//
// PLACEHOLDER: contenido real pendiente de definir — por ahora solo los
// nombres de los módulos existentes del panel, sin descripciones ni
// iconografía.
const HOME_MODULES = [
  'Catálogo',
  'Pedidos',
  'Clientes',
  'Colaboradores',
  'Reportes',
  'Agente IA',
];

export function ModulesShowcase() {
  return (
    <section className="w-full flex flex-col items-center justify-center min-h-screen lg:min-h-[calc(100vh-6rem)] px-6 py-24 text-center md:px-10 lg:px-16">
      {/* PLACEHOLDER: contenido real pendiente de definir */}
      <h2 className="text-2xl font-normal text-white md:text-4xl">
        Todo lo que hace{' '}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4CC2E8] via-[#818CF8] to-[#A78BFA]">
          AVENTHRA
        </span>{' '}
        por tu negocio
      </h2>

      <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3">
        {HOME_MODULES.map((moduleName) => (
          <span
            key={moduleName}
            className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-light text-white/70"
          >
            {moduleName}
          </span>
        ))}
      </div>
    </section>
  );
}
