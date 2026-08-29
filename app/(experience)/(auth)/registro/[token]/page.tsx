// app/(experience)/(auth)/registro/[token]/page.tsx
//
// El cliente llega acá desde el correo que se le mandó tras pagar en Wompi
// (ver lib/services/registrationService.ts → sendRegistrationLinkEmail).
// Abrir este enlace = prueba de que tiene acceso a ese correo (no hay OTP
// aparte). Acá completa los datos de su negocio y se crea la cuenta.
//
// Ruta de "entorno Pantalla 2" (matchesScreenTwoNavbar en
// components/experience/Experience.tsx): sin robot, con navbar dedicado.
import Link from "next/link";
import { getPendingRegistrationByToken } from "@/lib/services/registrationService";
import { ScreenTwoNavbar } from "@/components/landing/ScreenTwoNavbar";
import { ScreenTwoBackground } from "@/components/landing/ScreenTwoBackground";
import { HideStarfield } from "@/components/landing/HideStarfield";
import { RegistrationForm } from "./RegistrationForm";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HideStarfield />
      <ScreenTwoBackground />
      <ScreenTwoNavbar />
      <div className="flex min-h-screen w-full items-center justify-center px-6 py-28 md:px-10 lg:min-h-[calc(100vh-6rem)] lg:px-16 lg:py-0">
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </div>
    </>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <h1 className="nexora-headline text-3xl font-normal leading-tight text-white md:text-4xl">
        {title}
      </h1>
      <p className="aventhra-copy mt-5 text-sm leading-relaxed text-white/50 md:text-base">{body}</p>
      <div className="mt-9">
        <Link
          href="/login"
          className="text-sm text-white/35 underline underline-offset-2 transition-colors hover:text-white/60"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

export default async function RegistroPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPendingRegistrationByToken(token);

  if (result.status !== "ok") {
    const copy = {
      not_found: {
        title: "Enlace inválido",
        body: "Este enlace de registro no existe. Revisa que hayas copiado la dirección completa del correo.",
      },
      completed: {
        title: "Este enlace ya se usó",
        body: "Tu cuenta ya está creada. Entra con “Continuar con Google” usando el correo con el que pagaste.",
      },
      expired: {
        title: "Este enlace venció",
        body: "El enlace de registro caducó. Escríbenos por Contáctanos y te enviamos uno nuevo.",
      },
    }[result.status];

    return (
      <Shell>
        <StatusCard title={copy.title} body={copy.body} />
      </Shell>
    );
  }

  return (
    <Shell>
      <RegistrationForm
        token={token}
        email={result.data.email}
        planName={result.data.planName}
      />
    </Shell>
  );
}
