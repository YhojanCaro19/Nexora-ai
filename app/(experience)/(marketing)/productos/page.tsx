// app/(experience)/(marketing)/productos/page.tsx
//
// "Productos" — ruta normal, exactamente el mismo patrón que /soluciones,
// /precios y /clientes: HideStarfield (apaga el fondo de estrellas) +
// ScreenTwoNavbar + su contenido. Antes "Productos" era una sección con
// ancla dentro del Home (`/?section=modulos`), lo que causaba que al
// entrar se viera la Pantalla 1 por condiciones de carrera; ahora es una
// página aparte y se acabó el problema.
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { HideStarfield } from '@/components/landing/HideStarfield';
import { ModulesShowcase } from '@/components/landing/ModulesShowcase';

export default function ProductosPage() {
  return (
    <>
      <HideStarfield />
      <ScreenTwoNavbar />
      <ModulesShowcase />
    </>
  );
}
