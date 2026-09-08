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
          desvanece hacia afuera dejando ver el negro + las estrellas.
          · Pocas paradas de color (3) para no marcar "cortes".
          · `filter: blur(...)` fuerte disuelve cualquier banding restante.
          · La capa se sale del viewport (−22% / 144%) para que el borde
            del blur quede fuera de pantalla y no haga viñeta oscura.
          Todo por `style` inline (a prueba de CSS cacheado). */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-0"
        style={{
          top: "-30%",
          left: "-30%",
          width: "160%",
          height: "160%",
          background:
            "radial-gradient(ellipse 74vw 36vh at 50% 50%, rgba(129,140,248,0.56), rgba(129,140,248,0.16) 40%, transparent 76%)",
          filter: "blur(90px)",
        }}
      />

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </div>
  );
}
