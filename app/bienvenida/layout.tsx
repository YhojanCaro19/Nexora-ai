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
      {/* Estela de color de marca. Tres capas radiales, todo por `style`
          inline (nada de clases arbitrarias que el navegador cachee):
          1) lavado ANCHO y tenue que llega casi a los bordes,
          2) núcleo brillante y compacto al centro (cian/violeta fuerte),
          3) velo que solo hunde los bordes lejanos en el vacío. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 82% at 50% 42%, rgba(129,140,248,0.24), rgba(76,194,232,0.11) 40%, transparent 82%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(34% 27% at 50% 43%, rgba(167,139,250,0.48), rgba(129,140,248,0.22) 46%, transparent 74%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(175% 125% at 50% 42%, transparent 72%, var(--nexora-void) 100%)",
        }}
      />
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
