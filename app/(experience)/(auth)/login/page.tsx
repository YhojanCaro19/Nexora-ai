// app/(auth)/login/page.tsx
//
// 🐛→✅ Agregado <ScreenTwoNavbar/> — pedido explícito del usuario: "nada
// me debe llevar a la Pantalla 1" (robot + fondo 3D). Antes esta página
// usaba el <Navbar/> genérico + seguía mostrando el robot de fondo (se
// monta sin importar la ruta) — llegar acá desde "Iniciar sesión" del
// navbar de Pantalla 2 se sentía como si regenerara la Pantalla 1. Ahora
// es una ruta más de `SCREEN_TWO_NAVBAR_ROUTES` (Experience.tsx): sin
// robot, sin <Navbar/> genérico, mismo criterio que /soluciones,
// /precios, /clientes, /sobre-nosotros, /contacto.
import Link from "next/link";
import { signInWithGoogle } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FocusGlowCard } from "@/components/landing/FocusGlowCard";
import { ScreenTwoNavbar } from "@/components/landing/ScreenTwoNavbar";
import { ScreenTwoBackground } from "@/components/landing/ScreenTwoBackground";
import { OrbitRing } from "@/components/landing/OrbitRing";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
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

  return (
    <>
    <ScreenTwoBackground />
    <ScreenTwoNavbar />
    {/* lg:min-h-[calc(100vh-6rem)]: compensa el alto real que
        ScreenTwoNavbar (h-24, en flujo normal) ya ocupó arriba, para que
        este bloque + el navbar sumen exactamente 100vh — mismo criterio
        que /sobre-nosotros. */}
    <div className="w-full flex items-center min-h-screen lg:min-h-[calc(100vh-6rem)] px-6 md:px-10 lg:px-16">
      {/* 20% más grande, y luego 10% más chica sobre ese resultado:
          1.2 × 0.9 = 1.08 de base. Al enfocar un campo pasa a 1.08 × 1.05 =
          1.134 — no se suman los transforms, así que ya incluye la base. */}
      <FocusGlowCard
        className="w-full max-w-sm ml-0 md:ml-20 lg:ml-32 xl:ml-40 2xl:ml-52"
        // El 20%/8% de más era el tamaño pensado para desktop (espacio de
        // sobra al lado del robot) — aplicado también en mobile, la card
        // quedaba desbordando un viewport angosto y se sentía "demasiado
        // grande". Se queda en 100% en mobile y solo crece desde md:.
        baseScaleClass="scale-100 md:scale-[1.08]"
        activeScaleClass="scale-[1.03] md:scale-[1.134]"
      >
        {/* Anillo girando alrededor de TODA la card — pedido explícito del
            usuario, reconstruido con SVG puro (fill="none", ver el
            comentario grande en OrbitRing.tsx) después de que la versión
            con `mask-composite` causara un bug real de renderizado en
            Safari (líneas diagonales enormes). radius={16}: rounded-2xl
            de Tailwind = 1rem = 16px (no personalizado en este proyecto,
            ver --radius-* en globals.css — solo van hasta xl). */}
        <OrbitRing radius={16} className="w-full">
          {/* [--card-spacing:...] reduce el padding interno de Card en
              mobile (mismo mecanismo que ya usa components/ui/card.tsx
              para su propia variante "sm" — no se toca el primitivo, solo
              se sobreescribe la custom property en este uso puntual). */}
          <Card className="liquid-glass w-full rounded-2xl border-0 shadow-[0_8px_40px_rgba(0,0,0,0.4)] [--card-spacing:--spacing(3)] md:[--card-spacing:--spacing(4)]">
          <CardHeader className="text-center">
            <CardTitle className="text-xl md:text-2xl text-white font-normal">Iniciar sesión</CardTitle>
            <CardDescription className="text-white/45">
              Entra a tu panel de AVENTHRA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {params.error && (
              <p className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
                {params.error}
              </p>
            )}
            {params.message && (
              <p className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-sm text-emerald-400">
                {params.message}
              </p>
            )}

            <form action={signInWithGoogle}>
              <Button
                type="submit"
                variant="outline"
                className="w-full gap-2 bg-transparent border-white/15 text-white/80 hover:bg-white/5 hover:text-white"
              >
                <GoogleLogo />
                Continuar con Google
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-white/30">
              Usa el mismo correo con el que solicitaste acceso.
            </p>

            <p className="mt-4 text-center text-sm text-white/35">
              ¿Aún no tienes cuenta?{" "}
              <Link href="/contacto" className="underline text-white/60 hover:text-white transition-colors">
                Contáctanos
              </Link>
            </p>
          </CardContent>
        </Card>
        </OrbitRing>
      </FocusGlowCard>
    </div>
    </>
  );
}