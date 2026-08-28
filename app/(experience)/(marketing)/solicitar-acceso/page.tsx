// app/(experience)/(marketing)/solicitar-acceso/page.tsx
//
// A dónde cae alguien que inició sesión con Google pero cuyo correo no
// tiene acceso a AVENTHRA — puede ser un correo distinto al que registró
// en Contáctanos, o alguien que nunca pidió acceso. El callback de OAuth
// (app/(experience)/(auth)/callback/route.ts) ya cerró su sesión antes de
// mandarlo acá. Ruta de Pantalla 2 (ver SCREEN_TWO_NAVBAR_ROUTES en
// Experience.tsx): sin robot, con el navbar dedicado.
import Link from 'next/link';
import { ScreenTwoNavbar } from '@/components/landing/ScreenTwoNavbar';
import { ScreenTwoBackground } from '@/components/landing/ScreenTwoBackground';
import { OrbitButton } from '@/components/landing/OrbitButton';

export default async function SolicitarAccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <>
      <ScreenTwoBackground />
      <ScreenTwoNavbar />
      <div className="flex min-h-screen w-full items-center px-6 md:px-10 lg:min-h-[calc(100vh-6rem)] lg:px-16">
        <div className="mx-auto w-full max-w-xl text-center">
          <h1 className="nexora-headline text-3xl font-normal leading-tight text-white md:text-4xl">
            Este correo todavía no tiene acceso
          </h1>

          <p className="aventhra-copy mt-5 text-sm leading-relaxed text-white/50 md:text-base">
            {email ? (
              <>
                Iniciaste sesión con <span className="text-white/80">{email}</span>, pero
                ese correo no está habilitado en AVENTHRA.
              </>
            ) : (
              <>Ese correo no está habilitado en AVENTHRA.</>
            )}
          </p>

          <p className="aventhra-copy mt-3 text-sm leading-relaxed text-white/40">
            Si ya solicitaste acceso, entra con la cuenta de Google del correo
            exacto que registraste. Si aún no lo has hecho, cuéntanos sobre tu
            negocio y lo revisamos.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4">
            <OrbitButton href="/contacto">Solicitar acceso</OrbitButton>
            <Link
              href="/login"
              className="text-sm text-white/35 underline underline-offset-2 transition-colors hover:text-white/60"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
