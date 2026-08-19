// app/(dashboard)/admin/perfil/page.tsx
import { getSessionProfile } from "@/lib/auth/get-session";
import { getProfileDetails } from "@/lib/services/profileService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IdentityForm } from "./identity-form";
import { PasswordSection } from "./password-section";
import { SignOutAllDevices } from "./sign-out-all-devices";

export default async function PerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const details = await getProfileDetails(profile.userId, profile.businessId, profile.role, profile.fullName);

  return (
    <div className="space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Perfil
      </h1>

      <div className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Identidad</CardTitle>
            <CardDescription>Tu foto y tus datos personales dentro del negocio.</CardDescription>
          </CardHeader>
          <CardContent>
            <IdentityForm details={details} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>Contraseña y sesiones activas de tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <PasswordSection />
            <div className="pt-6 border-t" style={{ borderColor: 'var(--nexora-line)' }}>
              <SignOutAllDevices />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
