// app/(experience)/(marketing)/clientes/page.tsx
//
// Placeholder temporal — enlazado desde ScreenTwoNavbar.tsx ("Clientes").
// Sin clientes reales que mostrar todavía (decisión explícita del
// usuario); el contenido de verdad es una tarea aparte.
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { HideStarfield } from '@/components/landing/HideStarfield';
import { ScreenTwoBackground } from '@/components/landing/ScreenTwoBackground';
import { ComingSoonSection } from '@/components/landing/ComingSoonSection';

export default function ClientesPage() {
  return (
    <>
      <HideStarfield />
      <ScreenTwoBackground />
      <ScreenTwoNavbar />
      <ComingSoonSection
        title="Estamos construyendo esto — muy pronto."
        description="Todavía no tenemos casos de clientes reales para mostrar. Cuando los tengamos, los vas a ver acá — por ahora, si quieres ser de los primeros, escríbenos por Contáctanos."
      />
    </>
  );
}
