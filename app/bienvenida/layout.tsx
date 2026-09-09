// app/bienvenida/layout.tsx
//
// Onboarding del primer login del dueño. Pantalla completa, SIN
// DashboardShell. Solo el admin de un negocio que todavía no completó el
// onboarding puede verlo — el gate real también vive en admin/layout.tsx
// (redirige acá), esto cubre el acceso directo a /bienvenida.
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { OnboardingStarfield } from "./onboarding-starfield";
import { OnboardingShell } from "./onboarding-shell";

export default async function BienvenidaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") redirect("/login");
  if (profile.onboardingCompleted) redirect("/admin");

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ backgroundColor: "var(--nexora-void)", color: "var(--nexora-ink)" }}
    >
      {/* Fondo: campo de estrellas (siempre). La estela de color la monta el
          OnboardingShell — solo en las pantallas de personalización, nunca
          en el "welcome" (ver onboarding-shell / onboarding-wizard).

          El contenedor del wizard NO lleva `z-*` a propósito: así comparte
          contexto de apilamiento con el fondo (estrellas en `z-0`) y el
          `mix-blend-mode: screen` del video del robot puede fundirse contra
          ellos — el negro del video se vuelve invisible. Con un `z-10` aquí
          el blend quedaba aislado y el negro se veía como recuadro. */}
      <OnboardingStarfield />

      <OnboardingShell>
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
          {children}
        </div>
      </OnboardingShell>
    </div>
  );
}
