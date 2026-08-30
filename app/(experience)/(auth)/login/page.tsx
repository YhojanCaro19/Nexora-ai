// app/(experience)/(auth)/login/page.tsx
//
// Login de AVENTHRA. Auth SOLO con Google (ver docs/decisions.md). Las
// cuentas se crean después de pagar un plan (webhook de Wompi → correo con
// link → /registro/[token]); acá la persona entra con la MISMA cuenta de
// Google del correo con el que pagó.
//
// Ruta de "Pantalla 2" (SCREEN_TWO_NAVBAR_ROUTES en Experience.tsx): sin
// robot 3D, con el navbar dedicado (ScreenTwoNavbar) y el fondo de puntos.
import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { signInWithGoogle } from "../actions";
import { ScreenTwoNavbar } from "@/components/landing/ScreenTwoNavbar";
import { ScreenTwoBackground } from "@/components/landing/ScreenTwoBackground";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.73Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.6H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("auth.login");

  return (
    <>
      <ScreenTwoBackground />
      <ScreenTwoNavbar />

      {/* Centrado real: en desktop contra el alto que queda bajo el navbar
          (h-24), en mobile contra la pantalla con aire arriba para la
          barra superior mobile. */}
      <div className="flex min-h-screen w-full items-center justify-center px-6 pt-24 pb-16 lg:min-h-[calc(100vh-6rem)] lg:pt-0 lg:pb-0">
        <div className="w-full max-w-sm">
          {/* "Bienvenido" — FUERA de la card */}
          <div className="text-center">
            <h1 className="nexora-headline text-3xl font-normal tracking-tight text-white sm:text-4xl">
              <span className="aventhra-iridescent">{t("welcome")}</span>
            </h1>
            <p className="aventhra-copy mt-3 text-sm text-white/45">
              {t("subtitle")}
            </p>
          </div>

          {/* Card */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-7">
            {params.error && (
              <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-center text-sm text-red-300">
                {params.error}
              </p>
            )}
            {params.message && (
              <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center text-sm text-emerald-300">
                {params.message}
              </p>
            )}

            {/* Tarjetica: usa el correo de la compra */}
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                <Mail size={15} className="text-[#4CC2E8]" />
              </span>
              <div>
                <p className="text-sm font-medium text-white/85">
                  {t("purchaseTitle")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  {t("purchaseBody")}
                </p>
              </div>
            </div>

            {/* Botón de Google */}
            <form action={signInWithGoogle} className="mt-5">
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-medium text-white/90 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.12] hover:text-white"
              >
                <GoogleLogo />
                {t("google")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
