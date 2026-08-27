// app/(experience)/(marketing)/soluciones/page.tsx
//
// Placeholder temporal — enlazado desde ScreenTwoNavbar.tsx ("Soluciones").
// Sin contenido real todavía (decisión explícita del usuario); el
// contenido de verdad es una tarea aparte.
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { HideStarfield } from '@/components/landing/HideStarfield';
import { ScreenTwoBackground } from '@/components/landing/ScreenTwoBackground';
import { ComingSoonSection } from '@/components/landing/ComingSoonSection';
import { LandingVideo } from '@/components/landing/LandingVideo';

export default function SolucionesPage() {
  return (
    <>
      <HideStarfield />
      <ScreenTwoBackground />
      <ScreenTwoNavbar />
      <div className="relative overflow-hidden">
        {/* Loop de marca AVENTHRA — lado derecho, mismo tratamiento que la
            cabeza del robot en Productos (LandingVideo). `contain` porque es
            un wordmark ancho que no se puede recortar. Oculto en mobile. */}
        <div className="pointer-events-none absolute right-[2%] top-1/2 hidden aspect-square w-[42vw] max-w-[520px] -translate-y-1/2 lg:block">
          <LandingVideo src="/media/soluciones-loop.mp4" fit="contain" />
        </div>
        <ComingSoonSection
          title="Estamos construyendo esto — muy pronto."
          description="Todavía estamos afinando cómo mostrar las soluciones de AVENTHRA para cada tipo de negocio. Vuelve pronto — mientras tanto, cuéntanos sobre el tuyo y lo vemos juntos."
        />
      </div>
    </>
  );
}
