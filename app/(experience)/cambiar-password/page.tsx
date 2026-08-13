// app/(experience)/cambiar-password/page.tsx
import { ChangePasswordForm } from "./change-password-form";
import { FocusGlowCard } from "@/components/landing/FocusGlowCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="w-full flex items-center min-h-screen px-6 md:px-10 lg:px-16">
      <FocusGlowCard className="w-full max-w-sm ml-0 md:ml-20 lg:ml-32 xl:ml-40 2xl:ml-52">
        <Card className="liquid-glass w-full rounded-2xl border-0 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white font-normal">
              Crea tu contraseña definitiva
            </CardTitle>
            <CardDescription className="text-white/45">
              Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm error={params.error} />
          </CardContent>
        </Card>
      </FocusGlowCard>
    </div>
  );
}
