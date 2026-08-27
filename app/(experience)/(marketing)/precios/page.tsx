// app/(experience)/(marketing)/precios/page.tsx
//
// Placeholder temporal — enlazado desde ScreenTwoNavbar.tsx ("Precios").
// Sin precios definidos todavía (decisión explícita del usuario); el
// contenido de verdad es una tarea aparte.
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { HideStarfield } from '@/components/landing/HideStarfield';
import { ScreenTwoBackground } from '@/components/landing/ScreenTwoBackground';
import { ComingSoonSection } from '@/components/landing/ComingSoonSection';

export default function PreciosPage() {
  return (
    <>
      <HideStarfield />
      <ScreenTwoBackground />
      <ScreenTwoNavbar />
      <ComingSoonSection
        title="Estamos construyendo esto — muy pronto."
        description="Todavía no tenemos planes ni precios definidos para compartir. Escríbenos por Contáctanos y armamos algo a la medida de tu negocio mientras terminamos de definir esto."
      />
    </>
  );
}
