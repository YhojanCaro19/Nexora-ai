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
      {/* Estela de color de marca — grande y difusa, ocupa casi todo el
          viewport para que el fondo "respire" en cian/violeta, no un blob
          contenido. Va ENCIMA de las estrellas (mismo z-0, después en el
          DOM) pero con alfas bajas para no taparlas. */}
      <div
        aria-hidden
        className="nexora-breathe pointer-events-none fixed left-1/2 top-[38%] z-0 h-[120vh] w-[120vw] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(45% 42% at 50% 50%, rgba(129,140,248,0.24), rgba(76,194,232,0.12) 45%, transparent 74%)",
          filter: "blur(40px)",
        }}
      />
      {/* Velo radial: hunde los bordes en el vacío y deja "flotar" el
          contenido en el centro, igual que el wordmark de la landing. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(135% 90% at 50% 38%, transparent 50%, var(--nexora-void) 100%)",
        }}
      />
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
