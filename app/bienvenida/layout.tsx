// app/bienvenida/layout.tsx
//
// Onboarding del primer login del dueño. Pantalla completa, SIN
// DashboardShell. Solo el admin de un negocio que todavía no completó el
// onboarding puede verlo — el gate real también vive en admin/layout.tsx
// (redirige acá), esto cubre el acceso directo a /bienvenida.
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";
import { OnboardingStarfield } from "./onboarding-starfield";

export default async function BienvenidaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") redirect("/login");
  if (profile.onboardingCompleted) redirect("/admin");

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ backgroundColor: "var(--nexora-void)", color: "var(--nexora-ink)" }}
    >
      {/* Campo de estrellas — mismo tono que la Pantalla 1 de la landing. */}
      <OnboardingStarfield />
      {/* Velo radial: hunde los bordes en el vacío y deja "flotar" el
          contenido en el centro, igual que el wordmark de la landing. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 85% at 50% 38%, transparent 42%, var(--nexora-void) 100%)",
        }}
      />
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
