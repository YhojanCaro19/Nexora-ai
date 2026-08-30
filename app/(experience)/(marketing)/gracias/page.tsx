// app/(experience)/(marketing)/gracias/page.tsx
//
// A dónde vuelve la persona después de pagar en Wompi (redirect_url del
// checkout — ver lib/services/registrationService.ts). El pago se
// confirma por webhook, no acá: esta página solo explica qué sigue.
// Ruta de "entorno Pantalla 2" (ver matchesScreenTwoNavbar en
// components/experience/Experience.tsx): sin robot, con el navbar dedicado.
import Link from 'next/link';
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { ScreenTwoBackground } from '@/components/landing/ScreenTwoBackground';
import { HideStarfield } from '@/components/landing/HideStarfield';

export default function GraciasPage() {
  return (
    <>
      <HideStarfield />
      <ScreenTwoBackground />
      <ScreenTwoNavbar />
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-28 md:px-10 lg:min-h-[calc(100vh-6rem)] lg:px-16 lg:py-0">
        <div className="mx-auto w-full max-w-xl text-center">
          <h1 className="nexora-headline text-3xl font-normal leading-tight text-white md:text-4xl">
            Estamos confirmando tu pago
          </h1>

          <p className="aventhra-copy mt-5 text-sm leading-relaxed text-white/50 md:text-base">
            En cuanto el pago quede aprobado, te llega un correo a la dirección
            que usaste para pagar, con un enlace para activar tu cuenta y
            configurar tu negocio.
          </p>

          <p className="aventhra-copy mt-3 text-sm leading-relaxed text-white/40">
            Revisa tu bandeja de entrada (y el spam) en los próximos minutos.
            Asegúrate de tener acceso a ese correo: será tu forma de iniciar
            sesión con Google.
          </p>

          <div className="mt-9">
            <Link
              href="/"
              className="text-sm text-white/35 underline underline-offset-2 transition-colors hover:text-white/60"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
