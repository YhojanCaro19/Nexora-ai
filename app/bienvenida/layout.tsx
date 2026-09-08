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
      {/* Campo de estrellas sobre el vacío negro. */}
      <OnboardingStarfield />

      {/* Un solo resplandor de marca al centro: fuerte en el medio, se
          desvanece hacia afuera dejando ver el negro + las estrellas. Por
          `style` inline para que se aplique con CSS cacheado. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(98% 82% at 50% 42%, rgba(129,140,248,0.64) 0%, rgba(129,140,248,0.32) 20%, rgba(129,140,248,0.11) 46%, rgba(76,194,232,0.035) 72%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
