// app/(experience)/(auth)/login/page.tsx
//
// Login de AVENTHRA. Auth SOLO con Google (ver docs/decisions.md). Las
// cuentas se crean después de pagar un plan (webhook de Wompi → cuenta
// mínima + correo "cuenta lista"); acá la persona entra con la MISMA cuenta
// de Google del correo con el que pagó y completa el onboarding
// (/bienvenida) en su primer ingreso.
//
// Ruta de "Pantalla 2" (SCREEN_TWO_NAVBAR_ROUTES en Experience.tsx): sin
// robot 3D, con el navbar dedicado (ScreenTwoNavbar) y el fondo de puntos.
import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { signInWithGoogle } from "../actions";
import { ScreenTwoNavbar } from "@/components/landing/ScreenTwoNavbar";
import { ScreenTwoBackground } from "@/components/landing/ScreenTwoBackground";
import { AuthStarfield } from "@/components/landing/AuthStarfield";
import { OrbitFrame } from "@/components/landing/OrbitFrame";

// Degradado iridiscente de marca (el de las letras "AVENTHRA") como
// gradiente SVG animado, para pintar el TRAZO del ícono del buzón. Mismo
// patrón que admin/creditos/credits-panel.tsx. Se renderiza una vez.
const IR_GRADIENT_ID = "aventhra-login-mail";

function IridescentGradientDef() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient
          id={IR_GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="24"
          y2="0"
        >
          <stop offset="0" stopColor="#4CC2E8" />
          <stop offset="0.25" stopColor="#818CF8" />
          <stop offset="0.5" stopColor="#A78BFA" />
          <stop offset="0.75" stopColor="#818CF8" />
          <stop offset="1" stopColor="#4CC2E8" />
          <animateTransform
            attributeName="gradientTransform"
            type="translate"
            from="-24 0"
            to="24 0"
            dur="4s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
      <AuthStarfield />
      <ScreenTwoNavbar />
      <IridescentGradientDef />

      {/* Centrado real: en desktop contra el alto que queda bajo el navbar
          (h-24), en mobile contra la pantalla con aire arriba para la
          barra superior mobile. */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-6 pt-24 pb-[10vh] lg:min-h-[calc(100vh-6rem)] lg:pt-0 lg:pb-[10vh]">
        <div className="w-full max-w-sm">
          {/* "Bienvenido" — encabezado centrado, sin recuadro */}
          <div className="text-center">
            <h1 className="nexora-headline text-4xl font-normal tracking-tight text-white sm:text-5xl">
              <span className="aventhra-iridescent">{t("welcome")}</span>
            </h1>
            <p className="aventhra-copy mt-3 text-sm text-white/70">
              {t("subtitle")}
            </p>
          </div>

          {/* Sin card: las piezas flotan sobre el fondo como en los pasos
              del onboarding (superficies de vidrio translúcido). */}
          <div className="mt-8 space-y-5">
            {params.error && (
              <p
                className="rounded-xl border p-3 text-center text-sm"
                style={{
                  borderColor:
                    "color-mix(in oklch, var(--nexora-alert) 30%, transparent)",
                  backgroundColor:
                    "color-mix(in oklch, var(--nexora-alert) 12%, transparent)",
                  color: "var(--nexora-alert)",
                }}
              >
                {params.error}
              </p>
            )}
            {params.message && (
              <p
                className="rounded-xl border p-3 text-center text-sm"
                style={{
                  borderColor:
                    "color-mix(in oklch, var(--nexora-signal) 30%, transparent)",
                  backgroundColor:
                    "color-mix(in oklch, var(--nexora-signal) 12%, transparent)",
                  color: "var(--nexora-signal)",
                }}
              >
                {params.message}
              </p>
            )}

            {/* Card de cristal SIN fondo — solo el borde: la nota + el
                botón viven dentro de un marco translúcido, como los pasos
                del onboarding pero sin relleno. */}
            <div className="rounded-2xl border border-white/10 p-6 sm:p-7">
              {/* Nota "usa el correo de la compra" — centrada. */}
              <div className="flex flex-col items-center gap-2 text-center">
                <Mail
                  size={18}
                  strokeWidth={2}
                  className="shrink-0"
                  stroke={`url(#${IR_GRADIENT_ID})`}
                />
                <p className="text-sm font-medium text-white/85">
                  {t("purchaseTitle")}
                </p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-white/70">
                  {t("purchaseBody")}
                </p>
              </div>

              {/* Botón de Google — píldora de vidrio con el anillo de
                  degradado girando, mismo tratamiento que OrbitPillButton
                  del onboarding. */}
              <form
                action={signInWithGoogle}
                className="mt-6 flex justify-center"
              >
                <OrbitFrame
                  className="inline-block rounded-full"
                  innerClassName="rounded-full"
                  ringSize="h-[240px] w-[240px]"
                >
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2.5 rounded-full px-8 py-3.5 text-sm font-medium backdrop-blur-md transition-colors"
                    style={{
                      backgroundColor: "rgba(11, 12, 17, 0.45)",
                      color: "var(--nexora-ink)",
                    }}
                  >
                    <GoogleLogo />
                    {t("google")}
                  </button>
                </OrbitFrame>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
