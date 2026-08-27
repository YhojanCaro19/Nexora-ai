// app/(experience)/(marketing)/productos/page.tsx
//
// "Productos" — ruta normal, mismo patrón que /soluciones, /precios,
// /clientes. Renderiza exactamente la misma sección que se ve al scrollear
// la Pantalla 2 del Home (ProductosHero): "A 1 click de {…}" + la cabeza
// del robot. Así "Productos" es lo mismo, se llegue por scroll desde el
// inicio o por el link del navbar.
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { HideStarfield } from '@/components/landing/HideStarfield';
import { ProductosLanding } from '@/components/landing/ProductosLanding';

export default function ProductosPage() {
  return (
    <>
      <HideStarfield />
      <ScreenTwoNavbar />
      <ProductosLanding />
    </>
  );
}
