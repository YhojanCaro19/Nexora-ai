// app/(dashboard)/superadmin/perfil/page.tsx
//
// Mismo patrón que app/(dashboard)/admin/perfil/page.tsx — identidad +
// seguridad con datos reales — pero para la cuenta de superadmin, que
// vive en platform_admins en vez de business_members (ver profileService.ts,
// funciones *PlatformAdmin*).
import { getSessionProfile } from "@/lib/auth/get-session";
import { getPlatformAdminProfileDetails } from "@/lib/services/profileService";
import { getRecentLoginEvents } from "@/lib/services/loginEventService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IdentityForm } from "./identity-form";
import { SecurityPanel } from "./security-panel";

export default async function SuperadminPerfilPage() {
  const profile = await getSessionProfile();
  if (!profile) return null;

  const [details, loginEvents] = await Promise.all([
    getPlatformAdminProfileDetails(profile.userId, profile.fullName),
    getRecentLoginEvents(profile.userId),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-nexora text-xl text-center" style={{ color: 'var(--nexora-ink)' }}>
        Perfil
      </h1>

      <div className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Identidad</CardTitle>
            <CardDescription>Tu foto y tus datos personales como superadmin.</CardDescription>
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
          <CardContent>
            <SecurityPanel loginEvents={loginEvents} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
