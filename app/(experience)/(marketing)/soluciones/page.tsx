// app/(experience)/(marketing)/soluciones/page.tsx
//
// Placeholder temporal — enlazado desde ScreenTwoNavbar.tsx ("Soluciones").
// Sin contenido real todavía (decisión explícita del usuario); el
// contenido de verdad es una tarea aparte.
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { HideStarfield } from '@/components/landing/HideStarfield';
import { ScreenTwoBackground } from '@/components/landing/ScreenTwoBackground';
import { ComingSoonSection } from '@/components/landing/ComingSoonSection';

export default function SolucionesPage() {
  return (
    <>
      <HideStarfield />
      <ScreenTwoBackground />
      <ScreenTwoNavbar />
      <ComingSoonSection
        title="Estamos construyendo esto — muy pronto."
        description="Todavía estamos afinando cómo mostrar las soluciones de AVENTHRA para cada tipo de negocio. Vuelve pronto — mientras tanto, cuéntanos sobre el tuyo y lo vemos juntos."
      />
    </>
  );
}
