// app/bienvenida/layout.tsx
//
// Onboarding del primer login del dueño. Pantalla completa, SIN
// DashboardShell. Solo el admin de un negocio que todavía no completó el
// onboarding puede verlo — el gate real también vive en admin/layout.tsx
// (redirige acá), esto cubre el acceso directo a /bienvenida.
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { OnboardingStarfield } from "./onboarding-starfield";
import { OnboardingEstela } from "./onboarding-estela";

export default async function BienvenidaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") redirect("/login");
  if (profile.onboardingCompleted) redirect("/admin");

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ backgroundColor: "var(--nexora-void)", color: "var(--nexora-ink)" }}
    >
      {/* Fondo: estrellas + estela de color. Ambos entran con un fundido al
          montar; el contenido (el wizard) entra ~0.6s después con su propia
          animación framer.

          El contenedor del wizard NO lleva `z-*` a propósito: así comparte
          contexto de apilamiento con el fondo (estrellas + estela, en `z-0`)
          y el `mix-blend-mode: screen` del video del robot puede fundirse
          contra ellos — el negro del video se vuelve invisible. Con un `z-10`
          aquí el blend quedaba aislado y el negro se veía como recuadro. */}
      <OnboardingStarfield />
      <OnboardingEstela />

      <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
