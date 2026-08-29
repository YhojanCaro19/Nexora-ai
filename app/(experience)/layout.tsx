// app/(experience)/layout.tsx
//
// Un solo <Experience> (Canvas 3D + robot) compartido por (marketing) y
// (auth) — antes cada uno montaba el suyo, y como son layouts de grupos
// de rutas distintos, Next.js desmontaba uno y montaba el otro al navegar
// entre ellos (ej. /login -> /contacto), repitiendo la animación de entrada
// del robot cada vez. Al vivir un nivel arriba, persiste entre esas
// páginas: la animación de descenso solo se ve una vez por carga real de
// la app, y de ahí en adelante el robot ya está flotando.
import { Experience } from "@/components/experience/Experience";
import { WhatsAppFab } from "@/components/landing/WhatsAppFab";

export default function ExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Experience>{children}</Experience>
      {/* Botón flotante de WhatsApp (abajo a la derecha) — común a landing
          y auth. Se auto-oculta si NEXT_PUBLIC_WHATSAPP_NUMBER no está
          configurada. */}
      <WhatsAppFab />
    </>
  );
}
