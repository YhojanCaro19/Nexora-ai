// app/bienvenida/layout.tsx
//
// Onboarding del primer login del dueño. Pantalla completa, SIN
// DashboardShell. Solo el admin de un negocio que todavía no completó el
// onboarding puede verlo — el gate real también vive en admin/layout.tsx
// (redirige acá), esto cubre el acceso directo a /bienvenida.
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/get-session";

export default async function BienvenidaLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "admin") redirect("/login");
  if (profile.onboardingCompleted) redirect("/admin");

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ backgroundColor: "var(--nexora-void)", color: "var(--nexora-ink)" }}
    >
      {/* Estela de color de marca — GRANDE. Dos capas radiales cian/violeta
          que ocupan casi todo el viewport. Todo por `style` inline (nada de
          clases arbitrarias de Tailwind) para que se aplique aunque el
          navegador sirva un CSS cacheado. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(65% 48% at 50% 40%, rgba(129,140,248,0.34), rgba(76,194,232,0.16) 45%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(42% 34% at 50% 42%, rgba(167,139,250,0.32), rgba(76,194,232,0.10) 55%, transparent 78%)",
        }}
      />

      {/* Velo radial: hunde SOLO los bordes lejanos en el vacío. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(150% 100% at 50% 40%, transparent 62%, var(--nexora-void) 100%)",
        }}
      />
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
